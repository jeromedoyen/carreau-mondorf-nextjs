import { createBrowserClient } from '@supabase/ssr';

/** Client navigateur (composants client) — seul endroit qui a besoin de
 *  connaître la session en cours côté client (page de connexion, état
 *  connecté/déconnecté de la nav). Les pages de lecture de données restent
 *  sur src/lib/supabase.ts (RLS publique, pas besoin de session).
 *
 *  flowType: 'implicit' — sans effet sur la connexion par code à 6 chiffres
 *  (ConnexionForm.tsx : signInWithOtp() + verifyOtp(), aucun lien/cookie
 *  cross-device en jeu), mais gardé pour ne rien changer d'autre à la
 *  gestion de session existante. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit' } }
  );
}
