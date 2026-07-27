import 'server-only';
import { google } from 'googleapis';

/** Archivage des PV signés sur le Drive du club (Phase 3, 27/07/2026) —
 *  authentification par compte de service (pas de flux OAuth2
 *  utilisateur à maintenir : la clé JSON du compte de service, encodée
 *  en base64 dans GOOGLE_SERVICE_ACCOUNT_KEY_BASE64, autorise l'upload
 *  dans le seul dossier explicitement partagé avec ce compte côté Drive
 *  — jamais un accès large au Drive du club). */
function client() {
  const cleBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64;
  const dossierId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!cleBase64 || !dossierId) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 / GOOGLE_DRIVE_FOLDER_ID manquants.');
  }
  const identifiants = JSON.parse(Buffer.from(cleBase64, 'base64').toString('utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials: identifiants,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });
  return { drive: google.drive({ version: 'v3', auth }), dossierId };
}

export async function televerserVersDrive({
  nomFichier,
  pdfBuffer,
}: {
  nomFichier: string;
  pdfBuffer: Buffer;
}): Promise<{ fileId: string; lienConsultation: string }> {
  const { drive, dossierId } = client();

  const { Readable } = await import('stream');
  const reponse = await drive.files.create({
    requestBody: { name: nomFichier, parents: [dossierId] },
    media: { mimeType: 'application/pdf', body: Readable.from(pdfBuffer) },
    fields: 'id, webViewLink',
  });

  if (!reponse.data.id) throw new Error('Réponse Google Drive inattendue (id introuvable).');

  return {
    fileId: reponse.data.id,
    lienConsultation: reponse.data.webViewLink ?? `https://drive.google.com/file/d/${reponse.data.id}/view`,
  };
}
