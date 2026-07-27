'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const SOUS_MENU = [
  { href: '/saisons', label: 'Saisons' },
  { href: '/federation', label: 'Contrôle fédération' },
  { href: '/federation/calendrier', label: 'Calendrier fédération' },
  { href: '/outils/paiements', label: 'Appel à cotisation' },
  { href: '/outils/paiements-en-attente', label: 'Paiements en attente' },
  { href: '/outils/renouvellement', label: 'Renouvellement' },
  { href: '/outils/journal', label: 'Journal des actions' },
];

/** Regroupe les outils d'administration technique du CA (26/07/2026,
 *  pense-bête Jérôme : "je pense qu'il y aura d'autres outils qui viendront
 *  s'ajouter") — même pattern que ChampionnatMenu.tsx, mais réservé au CA
 *  (comme le "reserveCA" qu'avaient Saisons/Fédération dans NavLinks.tsx
 *  avant ce regroupement) : la vérification est_membre_ca() se fait ici
 *  plutôt que dans NavLinks, puisque tout le menu est CA-only. */
export function OutilsMenu() {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [estCA, setEstCA] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const actif = SOUS_MENU.some((s) => pathname.startsWith(s.href));

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      supabase.rpc('est_membre_ca').then(({ data: ca }) => setEstCA(!!ca));
    });
  }, []);

  useEffect(() => {
    if (!ouvert) return;
    function surClicExterieur(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener('mousedown', surClicExterieur);
    return () => document.removeEventListener('mousedown', surClicExterieur);
  }, [ouvert]);

  if (!estCA) return null;

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
        Outils
        <ChevronDown size={13} className={`transition-transform ${ouvert ? 'rotate-180' : ''}`} />
        <span
          className={`absolute -bottom-[15px] left-0 h-[2px] w-full bg-terracotta transition-transform duration-200 ${
            actif ? 'scale-x-100' : 'scale-x-0'
          }`}
        />
      </button>

      {ouvert && (
        <div className="entree absolute left-0 top-full mt-3 min-w-[200px] rounded-xl border border-ligne bg-sable-carte py-1.5 shadow-[0_8px_24px_-8px_rgba(36,27,18,.2)]">
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
