import 'server-only';
import crypto from 'crypto';

/** Client pour l'instance DocuSeal auto-hébergée (Render, 27/07/2026) —
 *  API REST confirmée contre la doc officielle (docuseal.com/docs/api) :
 *  self-hosted utilise `{DOCUSEAL_API_URL}/api/...` (le cloud DocuSeal
 *  utilise directement api.docuseal.com sans préfixe /api). Format exact
 *  de la réponse pas vérifié contre une vraie instance à l'écriture de ce
 *  fichier — à confirmer/ajuster au premier envoi réel. */
function configuration() {
  const url = process.env.DOCUSEAL_API_URL;
  const cle = process.env.DOCUSEAL_API_KEY;
  if (!url || !cle) {
    throw new Error('DOCUSEAL_API_URL / DOCUSEAL_API_KEY manquants.');
  }
  return { url: url.replace(/\/$/, ''), cle };
}

export async function creerSubmissionPdf({
  titre,
  pdfBase64,
  nomFichier,
  submitters,
}: {
  titre: string;
  pdfBase64: string;
  nomFichier: string;
  submitters: { email: string; nom: string }[];
}): Promise<{ submissionId: string }> {
  const { url, cle } = configuration();

  const reponse = await fetch(`${url}/api/submissions/pdf`, {
    method: 'POST',
    headers: { 'X-Auth-Token': cle, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: titre,
      documents: [{ name: nomFichier, file: pdfBase64 }],
      submitters: submitters.map((s) => ({ name: s.nom, email: s.email, send_email: true })),
      order: 'preserved',
    }),
  });

  if (!reponse.ok) {
    throw new Error(`DocuSeal a répondu ${reponse.status} : ${await reponse.text()}`);
  }

  const donnees = await reponse.json();
  // La réponse est un tableau d'objets "submitter", chacun rattaché à la
  // même soumission — on prend l'id de soumission sur le premier.
  const submissionId = Array.isArray(donnees) ? donnees[0]?.submission_id : donnees?.id;
  if (!submissionId) throw new Error('Réponse DocuSeal inattendue (submission_id introuvable).');

  return { submissionId: String(submissionId) };
}

/** Vérifie l'en-tête `X-Docuseal-Signature` (HMAC-SHA256, format
 *  `{timestamp}.{signature}` calculé sur `{timestamp}.{corps brut}`) —
 *  doc DocuSeal sur la sécurisation des webhooks. Le corps DOIT être le
 *  texte brut reçu, jamais un objet re-sérialisé (sinon la signature ne
 *  correspond plus). Tolérance de 5 minutes contre le rejeu. */
export function verifierSignatureWebhook(corpsBrut: string, enTeteSignature: string | null): boolean {
  const secret = process.env.DOCUSEAL_WEBHOOK_SECRET;
  if (!secret || !enTeteSignature) return false;

  const [timestamp, signature] = enTeteSignature.split('.');
  if (!timestamp || !signature) return false;

  const ageSecondes = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSecondes) || ageSecondes > 300) return false;

  const attendu = crypto.createHmac('sha256', secret).update(`${timestamp}.${corpsBrut}`).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(attendu);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
