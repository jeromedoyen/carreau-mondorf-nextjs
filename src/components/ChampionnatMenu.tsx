'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

const SOUS_MENU = [
  { href: '/national-d2', label: 'National D2' },
  { href: '/promotion', label: 'Promotion' },
];

/** Regroupe National D2 + Promotion sous une seule entrée "Championnat"
 *  (pense-bête Jérôme, 24/07/2026) — même pattern d'état actif que
 *  NavLinks.tsx, ouverture au clic/hover avec fermeture au clic extérieur. */
export function ChampionnatMenu() {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actif = SOUS_MENU.some((s) => pathname.startsWith(s.href));

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener('mousedown', surClicExterieur);
    return () => document.removeEventListener('mousedown', surClicExterieur);
  }, [ouvert]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-current={actif ? 'page' : undefined}
        className={`relative flex items-center gap-1 py-1 transition-colors ${
          actif ? 'text-terracotta' : 'text-encre-douce hover:text-terracotta'
        }`}
      >
        Championnat
        <ChevronDown size={13} className={`transition-transform ${ouvert ? 'rotate-180' : ''}`} />
        <span
          className={`absolute -bottom-[15px] left-0 h-[2px] w-full bg-terracotta transition-transform duration-200 ${
            actif ? 'scale-x-100' : 'scale-x-0'
          }`}
        />
      </button>

      {ouvert && (
        <div className="entree absolute left-0 top-full mt-3 min-w-[160px] rounded-xl border border-ligne bg-sable-carte py-1.5 shadow-[0_8px_24px_-8px_rgba(36,27,18,.2)]">
          {SOUS_MENU.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              onClick={() => setOuvert(false)}
              className={`block px-4 py-2 text-[13.5px] transition-colors ${
                pathname.startsWith(s.href)
                  ? 'text-terracotta'
                  : 'text-encre-douce hover:bg-sable hover:text-encre'
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
