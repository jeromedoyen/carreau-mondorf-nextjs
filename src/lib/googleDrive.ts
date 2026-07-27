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

const NOM_DOSSIER_SAUVEGARDES = 'Carreau Mondorf v2 — Sauvegardes automatiques';

/** Retrouve (ou crée au premier passage) le dossier de sauvegardes — même
 *  principe que getOrCreateDossierSauvegardes_() côté v1 (Code.gs) : pas de
 *  nouvel ID de dossier à configurer manuellement, juste un nom stable. */
async function dossierSauvegardes_(drive: ReturnType<typeof google.drive>): Promise<string> {
  const recherche = await drive.files.list({
    q: `name = '${NOM_DOSSIER_SAUVEGARDES}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
  });
  const existant = recherche.data.files?.[0]?.id;
  if (existant) return existant;

  const cree = await drive.files.create({
    requestBody: { name: NOM_DOSSIER_SAUVEGARDES, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id',
  });
  if (!cree.data.id) throw new Error('Impossible de créer le dossier de sauvegardes sur Drive.');
  return cree.data.id;
}

/** Instantané JSON de la base envoyé sur Drive (cf. src/lib/backup.ts) — ne
 *  conserve que les `conserver` fichiers les plus récents du dossier, même
 *  logique de rétention glissante que sauvegarderClasseur() en v1 (12
 *  sauvegardes hebdomadaires ≈ 3 mois d'historique). */
export async function televerserSauvegarde({
  nomFichier,
  contenu,
  conserver = 12,
}: {
  nomFichier: string;
  contenu: Buffer;
  conserver?: number;
}): Promise<{ fileId: string }> {
  const oAuth2Client = clientOAuth();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('GOOGLE_REFRESH_TOKEN manquant.');
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  const drive = google.drive({ version: 'v3', auth: oAuth2Client });

  const dossierId = await dossierSauvegardes_(drive);

  const { Readable } = await import('stream');
  const reponse = await drive.files.create({
    requestBody: { name: nomFichier, parents: [dossierId] },
    media: { mimeType: 'application/json', body: Readable.from(contenu) },
    fields: 'id',
  });
  if (!reponse.data.id) throw new Error('Réponse Google Drive inattendue (id introuvable).');

  const liste = await drive.files.list({
    q: `'${dossierId}' in parents and trashed = false`,
    fields: 'files(id, createdTime)',
    orderBy: 'createdTime desc',
  });
  const fichiers = liste.data.files ?? [];
  const aSupprimer = fichiers.slice(conserver);
  for (const f of aSupprimer) {
    if (f.id) await drive.files.update({ fileId: f.id, requestBody: { trashed: true } });
  }

  return { fileId: reponse.data.id };
}
