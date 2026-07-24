'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Point d'arrivée du lien de connexion cliqué depuis l'email (voir
 *  ConnexionForm.tsx — emailRedirectTo pointe ici). Avec flowType: 'implicit'
 *  (src/lib/supabase/client.ts), les jetons de session arrivent dans le
 *  fragment d'URL (#access_token=...) plutôt que via un ?code= à échanger —
 *  createClient() les récupère automatiquement à l'initialisation, il suffit
 *  d'attendre que getSession() résolve puis de rediriger. Page client (pas
 *  une Route Handler) car le fragment d'URL n'est jamais envoyé au serveur. */
export default function ConfirmationPage() {
  const router = useRouter();

  useEffect(() => {
    // Diagnostic temporaire (débogage échec de connexion, juillet 2026) :
    // capture l'état complet de l'URL à l'arrivée sur cette page, avant que
    // getSession() ne consomme le fragment — distingue "lien perdu en
    // route" (aucun #access_token ET aucune erreur Supabase) de "lien
    // rejeté par Supabase" (Supabase redirige avec ?error=... en cas de
    // token déjà utilisé/expiré, ce que le diagnostic précédent ne
    // capturait pas). À retirer une fois le diagnostic terminé.
    const avaitFragment = window.location.hash.includes('access_token');
    const params = new URLSearchParams(window.location.search);
    const erreurSupabase = params.get('error') || params.get('error_code') || '';
    const descriptionErreur = params.get('error_description') || '';
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace('/');
        return;
      }
      const diag = new URLSearchParams({
        erreur: 'lien_invalide',
        diag_fragment: String(avaitFragment),
        diag_erreur_supabase: erreurSupabase,
        diag_description: descriptionErreur,
      });
      router.replace(`/connexion?${diag.toString()}`);
    });
  }, [router]);

  return (
    <main className="mx-auto max-w-sm px-5 py-24 text-center">
      <p className="text-[14px] text-encre-douce">Connexion en cours…</p>
    </main>
  );
}
