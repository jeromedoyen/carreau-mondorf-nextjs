'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Point de nav "Outils", CA-only (28/07/2026, demande Jérôme : remplace
 *  le menu déroulant par une vraie page d'atterrissage en grille — voir
 *  src/app/outils/page.tsx). Ne gère plus que sa propre visibilité CA et
 *  son état actif, même pattern que les liens de NavLinks.tsx. */
export function OutilsMenu() {
  const pathname = usePathname();
  const [estCA, setEstCA] = useState(false);
  const actif = pathname.startsWith('/outils') || pathname.startsWith('/saisons') || pathname.startsWith('/federation');

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      supabase.rpc('est_membre_ca').then(({ data: ca }) => setEstCA(!!ca));
    });
  }, []);

  if (!estCA) return null;

  return (
    <Link
      href="/outils"
      aria-current={actif ? 'page' : undefined}
      className={`relative py-1 transition-colors ${actif ? 'text-terracotta' : 'text-encre-douce hover:text-terracotta'}`}
    >
      Outils
      <span
        className={`absolute -bottom-[15px] left-0 h-[2px] w-full bg-terracotta transition-transform duration-200 ${
          actif ? 'scale-x-100' : 'scale-x-0'
        }`}
      />
    </Link>
  );
}
