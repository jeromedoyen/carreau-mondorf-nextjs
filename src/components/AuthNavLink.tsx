'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Volontairement côté client (pas dans NavBar directement, qui reste un
 *  Server Component statique) : lire la session nécessite cookies()/session
 *  Supabase, ce qui forcerait Next.js à rendre TOUTES les pages en
 *  dynamique (perdant tout l'intérêt "prérendu statique, rapide" du
 *  prototype) si fait au niveau du layout. Ici, seul ce petit composant
 *  s'hydrate côté client — le reste de la page reste statique. */
export function AuthNavLink() {
  const router = useRouter();
  const supabase = createClient();
  const [connecte, setConnecte] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setConnecte(!!data.user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setConnecte(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  if (connecte === null) return null; // évite un flash avant hydratation

  if (!connecte) {
    return (
      <Link href="/connexion" className="text-encre-douce transition-colors hover:text-terracotta">
        Connexion
      </Link>
    );
  }

  return (
    <button
      onClick={async () => {
        await supabase.auth.signOut();
        router.push('/');
        router.refresh();
      }}
      className="text-encre-douce transition-colors hover:text-terracotta"
    >
      Déconnexion
    </button>
  );
}
