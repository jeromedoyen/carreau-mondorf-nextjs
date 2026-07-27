'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/** Pense-bête, 27/07/2026 : "retirer la possibilité de se connecter (dans
 *  la page club) si on est déjà connecté" — /club reste une page publique
 *  statique (Server Component), donc ce lien est isolé dans son propre
 *  composant client, même principe que AuthNavLink.tsx/LogoNavLink.tsx.
 *  Avant hydratation ou pour un visiteur non connecté : lien affiché
 *  normalement. */
export function ConnexionClubLink() {
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

  if (connecte) return null;

  return (
    <Link
      href="/connexion"
      className="inline-flex items-center gap-1.5 text-[12.5px] text-encre-douce transition-colors hover:text-terracotta"
    >
      <LogIn size={13} />
      Connexion
    </Link>
  );
}
