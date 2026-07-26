'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChampionnatMenu } from './ChampionnatMenu';
import { createClient } from '@/lib/supabase/client';

export const LIENS_PRINCIPAUX = [
  { href: '/calendrier', label: 'Calendrier' },
  { href: '/manifestations', label: 'Manifestations' },
  { href: '/conges', label: 'Congés' },
  { href: '/federation', label: 'Fédération' },
  { href: '/membres', label: 'Membres' },
  { href: '/saisons', label: 'Saisons', reserveCA: true },
];

/** Liens de nav desktop avec indicateur d'état actif — extrait de NavBar.tsx
 *  (Server Component statique) car usePathname exige un Client Component.
 *  L'indicateur (soulignement terracotta) répond à la règle UX "l'utilisateur
 *  doit toujours savoir où il se trouve dans la hiérarchie du site".
 *  National D2 + Promotion regroupés sous ChampionnatMenu (pense-bête
 *  Jérôme, 24/07/2026) plutôt que deux entrées séparées.
 *  "Saisons" masqué aux non-CA (reserveCA) — c'est un outil d'administration
 *  technique (créer/activer la saison suivante), pas une page consultée par
 *  les licenciés ; son contenu était déjà gardé côté page, mais le lien de
 *  nav restait visible à tout le monde (26/07/2026). Vérification RPC
 *  est_membre_ca() côté client, même pattern qu'AuthNavLink.tsx (évite de
 *  rendre toute l'app dynamique pour un simple bout de nav). */
export function NavLinks() {
  const pathname = usePathname();
  const [estCA, setEstCA] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      supabase.rpc('est_membre_ca').then(({ data: ca }) => setEstCA(!!ca));
    });
  }, []);

  return (
    <div className="hidden shrink-0 items-center gap-6 text-[13.5px] font-medium md:flex">
      <ChampionnatMenu />
      {LIENS_PRINCIPAUX.filter((lien) => !lien.reserveCA || estCA).map((lien) => {
        const actif = pathname.startsWith(lien.href);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            aria-current={actif ? 'page' : undefined}
            className={`relative py-1 transition-colors ${
              actif ? 'text-terracotta' : 'text-encre-douce hover:text-terracotta'
            }`}
          >
            {lien.label}
            <span
              className={`absolute -bottom-[15px] left-0 h-[2px] w-full bg-terracotta transition-transform duration-200 ${
                actif ? 'scale-x-100' : 'scale-x-0'
              }`}
            />
          </Link>
        );
      })}
    </div>
  );
}
