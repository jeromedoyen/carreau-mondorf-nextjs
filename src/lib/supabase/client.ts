import { createBrowserClient } from '@supabase/ssr';

/** Client navigateur (composants client) — seul endroit qui a besoin de
 *  connaître la session en cours côté client (page de connexion, état
 *  connecté/déconnecté de la nav). Les pages de lecture de données restent
 *  sur src/lib/supabase.ts (RLS publique, pas besoin de session).
 *
 *  flowType par défaut ('pkce', ne PAS le forcer sur 'implicit') —
 *  01/08/2026 : le forçage en 'implicit' (hérité de l'époque du code à 6
 *  chiffres, ConnexionForm.tsx d'alors, où PKCE n'était pas utilisé) a
 *  provoqué "pkce_code_verifier_not_found" au retour au lien magique :
 *  aucun cookie code_verifier n'est jamais posé en flow implicit, donc
 *  exchangeCodeForSession() (PKCE) échouait systématiquement, y compris
 *  même navigateur/même onglet. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
}
