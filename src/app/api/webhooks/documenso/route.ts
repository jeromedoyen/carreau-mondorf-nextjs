import { createClient as createServiceClient } from '@supabase/supabase-js';
import { appliquerRecipientsDocumenso, type RecipientDocumenso } from '@/lib/signatureSync';

/** Webhook Documenso (28/07/2026, demande Jérôme) — conservé au cas où le
 *  club passerait un jour sur une offre Documenso payante : les webhooks
 *  ne sont pas disponibles sur l'édition Community auto-hébergée gratuite
 *  (constaté en pratique le 28/07/2026), le mécanisme réellement actif
 *  aujourd'hui est le sondage périodique dans getDemandesSignature() (cf.
 *  src/lib/signatures.ts, src/lib/documenso.ts::obtenirStatutEnveloppe) —
 *  même logique de mise à jour, partagée via appliquerRecipientsDocumenso
 *  (src/lib/signatureSync.ts).
 *
 *  Si un jour activé : Documenso appelle cette route à chaque évènement
 *  (DOCUMENT_SENT, DOCUMENT_SIGNED, DOCUMENT_COMPLETED, ...) avec l'état
 *  courant du document ET de tous ses destinataires — on resynchronise
 *  depuis cet état plutôt que de dépendre du nom exact de l'évènement.
 *
 *  Authentification : secret partagé à configurer côté Documenso
 *  (Paramètres → Webhooks), vérifié ici via l'en-tête `X-Documenso-Secret`
 *  ou un champ `secret` du corps. Route publique par nature (comme
 *  /api/cron/sauvegarde) : c'est ce secret, pas l'URL, qui protège l'accès. */

function extraireRecipients(corps: unknown): RecipientDocumenso[] {
  const objet = corps as Record<string, unknown>;
  const payload = (objet?.payload as Record<string, unknown>) ?? objet;
  const recipients = (payload?.recipients ?? payload?.Recipient ?? []) as unknown;
  return Array.isArray(recipients) ? (recipients as RecipientDocumenso[]) : [];
}

function extraireDocumentId(corps: unknown): string | null {
  const objet = corps as Record<string, unknown>;
  const payload = (objet?.payload as Record<string, unknown>) ?? objet;
  const id = payload?.id ?? payload?.documentId ?? payload?.envelopeId;
  return id === undefined || id === null ? null : String(id);
}

export async function POST(requete: Request) {
  const secretAttendu = process.env.DOCUMENSO_WEBHOOK_SECRET;
  if (!secretAttendu) {
    return Response.json({ ok: false, error: 'DOCUMENSO_WEBHOOK_SECRET non configuré.' }, { status: 500 });
  }

  const corps = await requete.json().catch(() => null);
  if (!corps) return Response.json({ ok: false, error: 'Corps JSON invalide.' }, { status: 400 });

  const secretRecu =
    requete.headers.get('x-documenso-secret') ?? (corps as Record<string, unknown>)?.secret;
  if (secretRecu !== secretAttendu) {
    return Response.json({ ok: false, error: 'Secret invalide.' }, { status: 401 });
  }

  const documentId = extraireDocumentId(corps);
  const recipients = extraireRecipients(corps);
  if (!documentId || recipients.length === 0) {
    // Évènement sans document/destinataires exploitable (ex. test Documenso) — on accuse réception sans agir.
    return Response.json({ ok: true, ignore: true });
  }

  const supabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  const { data: demande, error: errDemande } = await supabase
    .from('demandes_signature')
    .select('id, statut')
    .eq('fournisseur_signature_id', documentId)
    .eq('supprime', false)
    .maybeSingle();
  if (errDemande || !demande) {
    return Response.json({ ok: true, ignore: true, raison: 'Demande introuvable pour ce document.' });
  }
  if (demande.statut === 'complete' || demande.statut === 'annulee') {
    return Response.json({ ok: true, deja_traite: true });
  }

  await appliquerRecipientsDocumenso(supabase, demande.id, recipients);

  return Response.json({ ok: true });
}
