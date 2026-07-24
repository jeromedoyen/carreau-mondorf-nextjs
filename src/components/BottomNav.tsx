'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Medal, CalendarDays, Users } from 'lucide-react';

const ONGLETS = [
  { href: '/', label: 'Accueil', Icon: Home },
  { href: '/national-d2', label: 'D2', Icon: Trophy },
  { href: '/promotion', label: 'Promotion', Icon: Medal },
  { href: '/calendrier', label: 'Calendrier', Icon: CalendarDays },
  { href: '/membres', label: 'Membres', Icon: Users },
];

/** Barre de navigation mobile en bas d'écran (< md) — remplace l'ancien
 *  menu hamburger déroulant. Pattern app-like : 5 destinations principales
 *  max (règle UX "bottom nav ≤ 5"), toujours atteignables au pouce, pas
 *  besoin d'ouvrir/fermer un panneau pour changer de section. L'auth reste
 *  dans NavBar (icône dédiée en haut), volontairement hors de cette barre
 *  — ce n'est pas une destination de contenu au même titre que les autres.
 *  safe-area-inset-bottom : respecte l'encoche/barre de gestes iOS. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ligne/70 bg-sable-carte/95 backdrop-blur-md md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around">
        {ONGLETS.map(({ href, label, Icon }) => {
          const actif = href === '/' ? pathname === '/' : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={actif ? 'page' : undefined}
              className="flex min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
            >
              <Icon
                size={22}
                strokeWidth={actif ? 2.4 : 1.8}
                className={actif ? 'text-terracotta' : 'text-encre-douce'}
              />
              <span
                className={`text-[10.5px] font-medium ${
                  actif ? 'text-terracotta' : 'text-encre-douce'
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
