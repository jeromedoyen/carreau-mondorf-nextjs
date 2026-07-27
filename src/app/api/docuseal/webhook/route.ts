import { verifierSignatureWebhook } from '@/lib/docuseal';
import { createServiceClient } from '@/lib/supabase/service';

/** Webhook DocuSeal (27/07/2026) — configuré côté DocuSeal (Settings →
 *  Webhooks) sur https://carreau-mondorf.com/api/docuseal/webhook, avec
 *  le secret HMAC copié dans DOCUSEAL_WEBHOOK_SECRET (.env.local + Vercel).
 *
 *  IMPORTANT — non vérifié contre une vraie instance : la doc DocuSeal
 *  documente les événements (`submission.completed` quand tous les
 *  signataires ont fini, `form.completed` par signataire) et un payload
 *  contenant un tableau `documents` avec URL téléchargeable, mais la forme
 *  exacte des champs (`data.id` vs `data.submission_id`, structure de
 *  `documents[].url`...) n'a pas pu être confirmée sans instance réelle.
 *  Au premier webhook reçu en vrai, regarder les logs Vercel pour ajuster
 *  les chemins ci-dessous si besoin — la vérification de signature, elle,
 *  est fiable (doc officielle suivie à la lettre). */
export async function POST(requete: Request) {
  const corpsBrut = await requete.text();
  const signature = requete.headers.get('x-docuseal-signature');

  if (!verifierSignatureWebhook(corpsBrut, signature)) {
    return new Response('Signature invalide', { status: 401 });
  }

  const evenement = JSON.parse(corpsBrut);
  const typeEvenement: string = evenement.event_type;
  const donnees = evenement.data ?? {};

  const supabase = createServiceClient();

  if (typeEvenement === 'form.completed' && donnees.email) {
    // Un signataire a terminé — pas forcément toute la demande.
    const submissionId = String(donnees.submission_id ?? donnees.submission?.id ?? '');
    if (submissionId) {
      const { data: demande } = await supabase
        .from('demandes_signature')
        .select('id')
        .eq('docuseal_submission_id', submissionId)
        .maybeSingle();
      if (demande) {
        await supabase
          .from('demandes_signature_signataires')
          .update({ signe_le: new Date().toISOString() })
          .eq('demande_id', demande.id)
          .eq('email', donnees.email);
      }
    }
  }

  if (typeEvenement === 'submission.completed') {
    const submissionId = String(donnees.id ?? donnees.submission_id ?? '');
    const urlDocumentSigne: string | undefined = donnees.documents?.[0]?.url;
    if (submissionId) {
      const { data: demande } = await supabase
        .from('demandes_signature')
        .select('id')
        .eq('docuseal_submission_id', submissionId)
        .maybeSingle();

      if (demande) {
        let cheminSigne: string | null = null;
        if (urlDocumentSigne) {
          const reponseFichier = await fetch(urlDocumentSigne);
          if (reponseFichier.ok) {
            const octets = await reponseFichier.arrayBuffer();
            cheminSigne = `signe-${demande.id}-${Date.now()}.pdf`;
            await supabase.storage
              .from('documents-signature')
              .upload(cheminSigne, Buffer.from(octets), { contentType: 'application/pdf' });
          }
        }

        await supabase
          .from('demandes_signature')
          .update({
            statut: 'complete',
            complete_le: new Date().toISOString(),
            ...(cheminSigne ? { chemin_storage_signe: cheminSigne } : {}),
          })
          .eq('id', demande.id);
      }
    }
  }

  return new Response('OK', { status: 200 });
}
