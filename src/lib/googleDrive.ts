import 'server-only';
import { google } from 'googleapis';

const REDIRECT_URI = 'https://carreau-mondorf.com/api/google/callback';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';

/** Archivage des PV signés sur le Drive du club (Phase 3, 27/07/2026) —
 *  compte Gmail gratuit, pas Google Workspace : un compte de service n'a
 *  pas de quota de stockage propre et ne peut écrire que dans un Drive
 *  partagé (fonctionnalité Workspace payante), constaté en pratique
 *  ("Service Accounts do not have storage quota"). Retour à un flux
 *  OAuth2 classique — Jérôme s'autorise une fois via /api/google/connect,
 *  le refresh_token obtenu est ensuite collé dans les variables d'env
 *  (jamais dans le chat) et sert à toutes les futures écritures sans
 *  nouvelle connexion. */
function clientOAuth() {
  const id = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const secret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  if (!id || !secret) throw new Error('GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET manquants.');
  return new google.auth.OAuth2(id, secret, REDIRECT_URI);
}

/** URL vers laquelle rediriger le CA pour l'autorisation initiale (une
 *  seule fois, tant que le refresh_token reste valide). */
export function urlAutorisationGoogle(): string {
  return clientOAuth().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent', // force la génération d'un refresh_token même si déjà autorisé avant
    scope: [SCOPE],
  });
}

export async function echangerCodeContreJetons(code: string): Promise<{ refreshToken: string }> {
  const oAuth2Client = clientOAuth();
  const { tokens } = await oAuth2Client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Aucun refresh_token reçu — révoque l'accès existant sur myaccount.google.com/permissions puis réessaie."
    );
  }
  return { refreshToken: tokens.refresh_token };
}

function client() {
  const dossierId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!dossierId || !refreshToken) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID / GOOGLE_REFRESH_TOKEN manquants.');
  }
  const oAuth2Client = clientOAuth();
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return { drive: google.drive({ version: 'v3', auth: oAuth2Client }), dossierId };
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
