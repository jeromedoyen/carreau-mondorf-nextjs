import { createClient as createServiceClient } from '@supabase/supabase-js';

/** Webhook Documenso (28/07/2026, demande Jérôme) — jusqu'ici le suivi
 *  d'une signature était 100% manuel (le CA constatait dans Documenso puis
 *  cliquait "marquer signé" sur /outils/signatures). Documenso appelle
 *  cette route à chaque évènement (DOCUMENT_SENT, DOCUMENT_OPENED,
 *  DOCUMENT_SIGNED, DOCUMENT_COMPLETED, ...) avec l'état courant du
 *  document ET de tous ses destinataires — on se contente de resynchroniser
 *  `demandes_signature_signataires.signe_le` depuis ce que Documenso
 *  rapporte plutôt que de dépendre du nom exact de l'évènement, plus
 *  robuste si Documenso ajoute/renomme des évènements. Dès que tous les
 *  signataires d'une demande sont signés, la demande passe "complete"
 *  (même règle que marquerSignataireSigne côté action manuelle, gardée en
 *  place pour le cas où le CA préfère toujours pointer à la main).
 *
 *  Authentification : à configurer côté Documenso (Paramètres → Webhooks)
 *  avec un "secret" partagé — on vérifie ici l'en-tête
 *  `X-Documenso-Secret` ET, au cas où Documenso l'enverrait plutôt dans le
 *  corps, un champ `secret` du payload. Route publique par nature (comme
 *  /api/cron/sauvegarde) : c'est ce secret, pas l'URL, qui protège l'accès.
 *
 *  Pas de récupération automatique du PDF signé ici (endpoint de
 *  téléchargement Documenso non vérifié en pratique) — l'archivage reste
 *  un geste CA (enregistrerPdfSigne / archiverDansGoogleDrive sur
 *  /outils/signatures), seul le suivi de statut est automatisé. */

type RecipientDocumenso = {
  email?: string;
  signingStatus?: string;
  status?: string;
  signedAt?: string | null;
};

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

function estSigne(r: RecipientDocumenso): boolean {
  return r.signingStatus === 'SIGNED' || r.status === 'SIGNED' || !!r.signedAt;
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

  const supabase = createServiceClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

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

  for (const r of recipients) {
    if (!r.email || !estSigne(r)) continue;
    await supabase
      .from('demandes_signature_signataires')
      .update({ signe_le: r.signedAt ?? new Date().toISOString() })
      .eq('demande_id', demande.id)
      .eq('email', r.email)
      .is('signe_le', null);
  }

  const { data: restants } = await supabase
    .from('demandes_signature_signataires')
    .select('id')
    .eq('demande_id', demande.id)
    .is('signe_le', null);

  if (restants && restants.length === 0) {
    await supabase
      .from('demandes_signature')
      .update({ statut: 'complete', complete_le: new Date().toISOString() })
      .eq('id', demande.id);
  }

  return Response.json({ ok: true });
}
