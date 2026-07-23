'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';
import { AuthNavLink } from './AuthNavLink';

const LIENS = [
  { href: '/national-d2', label: 'National D2' },
  { href: '/promotion', label: 'Promotion' },
  { href: '/calendrier', label: 'Calendrier' },
  { href: '/membres', label: 'Membres' },
];

/** Menu mobile (< md) — la nav horizontale déborde et se chevauche en
 *  dessous de ~640px (jamais testé sur petit écran avant cette passe de
 *  QA). NavBar.tsx reste un Server Component statique ; seul ce bouton et
 *  son panneau déroulant sont interactifs. */
export function MobileMenu() {
  const [ouvert, setOuvert] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-label={ouvert ? 'Fermer le menu' : 'Ouvrir le menu'}
        aria-expanded={ouvert}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-encre-douce transition-colors hover:bg-sable hover:text-encre"
      >
        {ouvert ? <X size={20} /> : <Menu size={20} />}
      </button>

      {ouvert && (
        <div className="entree absolute inset-x-0 top-full border-b border-ligne/70 bg-sable-carte px-5 py-3 shadow-[0_4px_12px_rgba(36,27,18,.08)]">
          <div className="flex flex-col gap-1">
            {LIENS.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                onClick={() => setOuvert(false)}
                className="rounded-lg px-2 py-2.5 text-[14.5px] font-medium text-encre-douce transition-colors hover:bg-sable hover:text-terracotta"
              >
                {lien.label}
              </Link>
            ))}
            <div className="mt-1 border-t border-ligne px-2 pt-3 text-[14.5px] font-medium">
              <AuthNavLink />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
