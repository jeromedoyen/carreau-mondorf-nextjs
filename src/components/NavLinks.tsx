'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChampionnatMenu } from './ChampionnatMenu';
import { OutilsMenu } from './OutilsMenu';
import { createClient } from '@/lib/supabase/client';

export const LIENS_PRINCIPAUX = [
  { href: '/calendrier', label: 'Calendrier' },
  { href: '/manifestations', label: 'Manifestations' },
  { href: '/benevole', label: 'Bénévole' },
  { href: '/conges', label: 'Congés', reserveCA: true },
  { href: '/membres', label: 'Membres', reserveCA: true },
];

/** Liens de nav desktop avec indicateur d'état actif — extrait de NavBar.tsx
 *  (Server Component statique) car usePathname exige un Client Component.
 *  L'indicateur (soulignement terracotta) répond à la règle UX "l'utilisateur
 *  doit toujours savoir où il se trouve dans la hiérarchie du site".
 *  National D2 + Promotion regroupés sous ChampionnatMenu (pense-bête
 *  Jérôme, 24/07/2026). Saisons/Fédération regroupés sous OutilsMenu
 *  (26/07/2026, même pense-bête : "il y aura d'autres outils qui viendront
 *  s'ajouter") — OutilsMenu gère lui-même sa visibilité CA-only, ce menu-ci
 *  ne s'occupe donc plus que de Congés/Membres (reserveCA, corrigé le
 *  26/07/2026 : le lien restait visible même quand le contenu était déjà
 *  réservé au CA). Calendrier/Manifestations restent visibles à tout
 *  utilisateur connecté (licencié, membre ou CA). Vérification RPC
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
      <OutilsMenu />
    </div>
  );
}
