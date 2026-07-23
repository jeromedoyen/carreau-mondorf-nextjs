import { createBrowserClient } from '@supabase/ssr';

/** Client navigateur (composants client) — seul endroit qui a besoin de
 *  connaître la session en cours côté client (page de connexion, état
 *  connecté/déconnecté de la nav). Les pages de lecture de données restent
 *  sur src/lib/supabase.ts (RLS publique, pas besoin de session). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
