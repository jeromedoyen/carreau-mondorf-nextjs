import { createBrowserClient } from '@supabase/ssr';

/** Client navigateur (composants client) — seul endroit qui a besoin de
 *  connaître la session en cours côté client (page de connexion, état
 *  connecté/déconnecté de la nav). Les pages de lecture de données restent
 *  sur src/lib/supabase.ts (RLS publique, pas besoin de session).
 *
 *  flowType: 'implicit' (choix conscient, 01/08/2026, demande Jérôme) —
 *  PKCE liait la connexion à l'appareil/navigateur qui avait DEMANDÉ le
 *  lien (via un cookie "code verifier") : ouvrir l'email sur un autre
 *  appareil que celui de la demande échouait systématiquement
 *  ("pkce_code_verifier_not_found"), un cas d'usage réel et fréquent (lire
 *  son email sur le téléphone après avoir demandé le lien depuis un PC).
 *  Le flow implicit livre les jetons de session directement dans l'URL de
 *  redirection (fragment #access_token=...) : aucun secret stocké
 *  nulle part, donc cliquable depuis n'importe quel appareil.
 *  Contrepartie assumée : n'importe quel flow "lien cliquable" (implicit
 *  ou PKCE) reste vulnérable aux scanners anti-spam qui pré-visitent le
 *  lien de vérification Supabase avant l'utilisateur, consommant le jeton
 *  à usage unique — risque structurel à tout lien magique, pas propre à
 *  ce choix de flow. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: 'implicit' } }
  );
}
