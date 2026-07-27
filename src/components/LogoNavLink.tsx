'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

/** Logo de la nav (pense-bête, 27/07/2026 : "quand je suis connecté et que
 *  je clique sur le logo... je me redirige sur Moncaro") — même principe
 *  que AuthNavLink.tsx : lecture de session côté client uniquement, pour
 *  ne pas forcer tout le layout en rendu dynamique. Avant hydratation
 *  (connecte === null), pointe vers "/" — comportement public par défaut,
 *  jamais un flash vers /moncaro pour un visiteur non connecté. */
export function LogoNavLink() {
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

  return (
    <Link href={connecte ? '/moncaro' : '/'} className="flex min-w-0 items-center gap-2.5">
      <Image
        src="/logo.png"
        alt="Carreau Mondorf"
        width={500}
        height={261}
        priority
        className="h-[34px] w-auto shrink-0"
      />
      <span className="font-display truncate text-[17px] font-semibold tracking-tight">Carreau Mondorf</span>
    </Link>
  );
}
