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
    // capture si le fragment #access_token=... était présent à l'arrivée
    // sur cette page, avant que getSession() ne le consomme — permet de
    // savoir si le lien a perdu ses jetons en route (lien réécrit par le
    // client mail) ou s'il a été consommé avant le clic (scanner de
    // sécurité). À retirer une fois le diagnostic terminé.
    const avaitFragment = window.location.hash.includes('access_token');
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      router.replace(
        data.session ? '/' : `/connexion?erreur=lien_invalide&diag_fragment=${avaitFragment}`
      );
    });
  }, [router]);

  return (
    <main className="mx-auto max-w-sm px-5 py-24 text-center">
      <p className="text-[14px] text-encre-douce">Connexion en cours…</p>
    </main>
  );
}
