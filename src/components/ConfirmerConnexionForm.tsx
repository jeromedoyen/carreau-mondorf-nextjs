'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Flow "implicit" (cf. lib/supabase/client.ts) : dès le chargement de
 *  cette page, le client Supabase (detectSessionInUrl, activé par défaut)
 *  lit automatiquement le fragment #access_token=... déposé par la
 *  redirection de vérification et établit la session — aucun échange
 *  manuel à faire ici, contrairement à l'ancien flow PKCE
 *  (exchangeCodeForSession). On écoute juste l'événement pour rediriger
 *  une fois la session prête. */
export function ConfirmerConnexionForm() {
  const supabase = createClient();
  const router = useRouter();
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // /moncaro (pas /club) : tableau de bord personnel après connexion,
        // demande explicite de Jérôme le 26/07/2026.
        router.replace('/moncaro');
      }
    });

    // Session déjà établie avant même le montage du composant (course
    // possible entre detectSessionInUrl et l'abonnement ci-dessus).
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/moncaro');
    });

    // Si rien ne s'est passé après quelques secondes, le lien est
    // probablement invalide/expiré (ex. déjà utilisé par un scanner
    // anti-spam) — message d'erreur plutôt qu'une attente silencieuse.
    const delai = setTimeout(() => {
      setErreur('Lien invalide ou expiré — redemande un lien de connexion.');
    }, 5000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(delai);
    };
  }, [supabase, router]);

  return (
    <div className="w-full rounded-2xl border border-ligne bg-sable-carte p-7 text-center shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      {erreur ? (
        <p className="text-[14px] text-danger">{erreur}</p>
      ) : (
        <p className="text-[14px] text-encre">Connexion en cours…</p>
      )}
    </div>
  );
}
