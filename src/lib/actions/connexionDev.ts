'use server';

import { createClient as createClientAnon } from '@supabase/supabase-js';
import { createClient as createClientServeur } from '@/lib/supabase/server';

/** Connexion directe sans passer par l'envoi/la saisie d'un code —
 *  réservé aux environnements non-production, pour débloquer les tests
 *  pendant que le flux OTP par email (Resend + template Supabase) reste
 *  instable (v. CONTEXTE_PROJET.md, bug lien magique / code jamais reçu,
 *  demande de Jérôme le 05/08/2026).
 *
 *  Gardé par `VERCEL_ENV`, jamais par une variable `NEXT_PUBLIC_*` ou une
 *  simple condition `NODE_ENV` : Next.js build toujours en mode
 *  `production` (NODE_ENV) même pour un déploiement preview, donc seul
 *  `VERCEL_ENV` distingue fiablement preview/dev de la vraie prod. En
 *  local (hors Vercel), `VERCEL_ENV` est absent — traité comme non-prod.
 *
 *  Utilise `admin.generateLink()` (clé service role) puis `verifyOtp()`
 *  avec le `hashed_token` obtenu : passe par le même Auth Hook "Before
 *  user created" (supabase/migrations/0002_acces.sql) que le flux normal
 *  — une adresse non autorisée échoue exactement pareil, ce n'est pas une
 *  porte dérobée pour contourner la liste d'accès, juste un raccourci qui
 *  évite l'aller-retour email. */
export async function connexionDirecteDev(email: string): Promise<{ erreur: string | null }> {
  if (process.env.VERCEL_ENV === 'production') {
    return { erreur: 'Connexion directe désactivée en production.' };
  }

  const adresse = email.trim().toLowerCase();
  if (!adresse.includes('@')) {
    return { erreur: 'Adresse email invalide.' };
  }

  // SUPABASE_SECRET_KEY n'existe dans aucun scope Vercel (Preview/Prod/Dev)
  // au 05/08/2026 — seulement dans .env.local en local. Sans cette
  // vérification, le SDK échoue plus loin de façon peu claire et le bouton
  // "tourne dans le vide" côté client (bug remonté par Jérôme).
  if (!process.env.SUPABASE_SECRET_KEY) {
    return { erreur: "Connexion directe indisponible : SUPABASE_SECRET_KEY manquante sur cet environnement (à ajouter dans Vercel → Preview)." };
  }

  const adminClient = createClientAnon(
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY
  );

  const { data, error: erreurGeneration } = await adminClient.auth.admin.generateLink({
    type: 'magiclink',
    email: adresse,
  });

  // Message neutre, même principe que le flux normal : on ne confirme pas
  // côté client si l'adresse est autorisée ou non.
  if (erreurGeneration || !data?.properties?.hashed_token) {
    return { erreur: 'Connexion impossible avec cette adresse.' };
  }

  const supabase = await createClientServeur();
  const { error: erreurVerification } = await supabase.auth.verifyOtp({
    type: 'email',
    token_hash: data.properties.hashed_token,
  });

  if (erreurVerification) {
    return { erreur: 'Connexion impossible avec cette adresse.' };
  }

  return { erreur: null };
}
