'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const LIENS_PRINCIPAUX = [
  { href: '/national-d2', label: 'National D2' },
  { href: '/promotion', label: 'Promotion' },
  { href: '/calendrier', label: 'Calendrier' },
  { href: '/manifestations', label: 'Manifestations' },
  { href: '/conges', label: 'Congés' },
  { href: '/federation', label: 'Fédération' },
  { href: '/membres', label: 'Membres' },
];

/** Liens de nav desktop avec indicateur d'état actif — extrait de NavBar.tsx
 *  (Server Component statique) car usePathname exige un Client Component.
 *  L'indicateur (soulignement terracotta) répond à la règle UX "l'utilisateur
 *  doit toujours savoir où il se trouve dans la hiérarchie du site". */
export function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="hidden shrink-0 items-center gap-6 text-[13.5px] font-medium md:flex">
      {LIENS_PRINCIPAUX.map((lien) => {
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
