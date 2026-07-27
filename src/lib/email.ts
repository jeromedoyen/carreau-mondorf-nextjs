import 'server-only';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

let logoClub: Buffer | null = null;

/** Logo du club en pièce jointe `cid:` plutôt qu'en image distante
 *  (`https://carreau-mondorf.com/logo.png`) — beaucoup de clients mail
 *  (Outlook desktop notamment) bloquent le chargement des images
 *  distantes par défaut, ce qui grise le logo tant que l'utilisateur n'a
 *  pas cliqué "Afficher les images" (pense-bête Jérôme, 27/07/2026). Une
 *  image intégrée au message ne subit pas ce blocage. Lu une seule fois
 *  et mis en cache : le fichier ne change jamais en cours d'exécution. */
export function chargerLogoClub(): Buffer {
  if (!logoClub) {
    logoClub = fs.readFileSync(path.join(process.cwd(), 'public', 'logo.png'));
  }
  return logoClub;
}

/** Un seul transporteur SMTP réutilisé pour toute l'app (compte dédié
 *  carreau-mondorf.com) — port 587 + STARTTLS par défaut, comme documenté
 *  dans le pense-bête (smtp.pt.lu et équivalents utilisent ce schéma).
 *  Ne PAS utiliser pour les liens magiques de connexion : ceux-ci passent
 *  par le SMTP custom configuré côté Supabase Auth (dashboard), pas par ce
 *  module — Supabase génère lui-même le token et le lien signé. */
function creerTransporteur() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST / SMTP_USER / SMTP_PASS manquants — voir .env.local.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function envoyerEmail({
  destinataire,
  sujet,
  html,
  attachments,
}: {
  destinataire: string;
  sujet: string;
  html: string;
  /** Pièces jointes intégrées (ex. QR code en `cid:` référencé depuis le
   *  HTML) — plus fiable qu'une image en `data:` URI, que certains clients
   *  mail de bureau (Outlook) suppriment silencieusement. */
  attachments?: { filename: string; content: Buffer; cid: string }[];
}) {
  const transporteur = creerTransporteur();
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  await transporteur.sendMail({ from, to: destinataire, subject: sujet, html, attachments });
}
