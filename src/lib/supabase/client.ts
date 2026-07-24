import { createBrowserClient } from '@supabase/ssr';

/** Client navigateur (composants client) — seul endroit qui a besoin de
 *  connaître la session en cours côté client (page de connexion, état
 *  connecté/déconnecté de la nav). Les pages de lecture de données restent
 *  sur src/lib/supabase.ts (RLS publique, pas besoin de session).
 *
 *  flowType: 'implicit' plutôt que le PKCE par défaut de @supabase/ssr —
 *  le PKCE stocke un code_verifier dans un cookie propre au navigateur qui a
 *  fait la demande de lien, donc échoue si le lien est ouvert depuis un
 *  autre navigateur/appareil (webmail, appli mail du téléphone...), ce qui
 *  était le cas ici (v. CONTEXTE_PROJET.md). Le flux implicite embarque les
 *  jetons de session directement dans l'URL du lien (fragment #access_token),
 *  donc aucune dépendance à un cookie posé au moment de la demande — et ça
 *  fonctionne avec le template email par défaut de Supabase (pas besoin de
 *  SMTP custom pour le modifier, contrairement au flux token_hash). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit' } }
  );
}
