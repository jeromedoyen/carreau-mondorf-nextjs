'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, CalendarDays, Users, HeartHandshake, MoreHorizontal, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

/** Bénévole ajouté ici le 26/07/2026 (retour Jérôme : "bénévole n'apparaît
 *  pas" sur mobile — cette barre ne dérive pas de LIENS_PRINCIPAUX, il faut
 *  l'y déclarer explicitement). Promotion retirée de la barre pour tenir la
 *  règle "≤5 onglets" : National D2 reste seul en vitrine mobile, Promotion
 *  demeure accessible depuis le menu Championnat en desktop et depuis
 *  l'accueil. */
const ONGLETS = [
  { href: '/', label: 'Accueil', Icon: Home },
  { href: '/national-d2', label: 'D2', Icon: Trophy },
  { href: '/calendrier', label: 'Calendrier', Icon: CalendarDays },
  { href: '/benevole', label: 'Bénévole', Icon: HeartHandshake },
  { href: '/membres', label: 'Membres', Icon: Users },
];

/** Le reste des pages (ChampionnatMenu/NavLinks/OutilsMenu, tous
 *  `hidden md:flex`) n'a aucun point d'entrée mobile — note vocale de
 *  Jérôme, 02/08/2026 : "il m'est impossible de scroller ... il m'en
 *  manque". Ce n'était pas un bug de scroll (la barre n'a jamais été
 *  scrollable, volontairement plafonnée à 5 icônes) mais un vrai trou de
 *  navigation : Promotion, Congés, Fédération, Saisons, Outils/*, /concours
 *  (nouveau module remboursements) et Le Club étaient purement
 *  inatteignables sur mobile. Panneau "Plus" en 6e position, même
 *  filtrage CA que NavLinks.tsx. */
const LIENS_PLUS = [
  { href: '/manifestations', label: 'Manifestations' },
  { href: '/promotion', label: 'Promotion' },
  { href: '/concours', label: 'Concours & remboursements' },
  { href: '/moncaro', label: 'Mon Caro' },
  { href: '/club', label: 'Le Club' },
  { href: '/conges', label: 'Congés', reserveCA: true },
  { href: '/federation', label: 'Fédération', reserveCA: true },
  { href: '/saisons', label: 'Saisons', reserveCA: true },
  { href: '/outils', label: 'Outils', reserveCA: true },
];

export function BottomNav() {
  const pathname = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const [estCA, setEstCA] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      supabase.rpc('est_membre_ca').then(({ data: ca }) => setEstCA(!!ca));
    });
  }, []);

  const liensVisibles = LIENS_PLUS.filter((l) => !l.reserveCA || estCA);
  const panneauActif = liensVisibles.some((l) => pathname.startsWith(l.href));

  return (
    <>
      {ouvert && (
        <div
          className="fixed inset-0 z-30 bg-encre/30 md:hidden print:hidden"
          onClick={() => setOuvert(false)}
        >
          <div
            className="entree fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] rounded-t-2xl border-t border-ligne bg-sable-carte p-4 shadow-[0_-8px_24px_-8px_rgba(36,27,18,.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-[15px]">Plus</span>
              <button
                type="button"
                onClick={() => setOuvert(false)}
                aria-label="Fermer"
                className="text-encre-douce hover:text-encre"
              >
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {liensVisibles.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOuvert(false)}
                  className={`rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                    pathname.startsWith(l.href)
                      ? 'bg-terracotta/10 text-terracotta'
                      : 'bg-sable text-encre-douce hover:text-encre'
                  }`}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ligne/70 bg-sable-carte/95 backdrop-blur-md md:hidden print:hidden"
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
          <button
            type="button"
            onClick={() => setOuvert((v) => !v)}
            aria-expanded={ouvert}
            className="flex min-w-[44px] flex-1 flex-col items-center justify-center gap-0.5 py-2 transition-colors"
          >
            <MoreHorizontal
              size={22}
              strokeWidth={panneauActif ? 2.4 : 1.8}
              className={panneauActif || ouvert ? 'text-terracotta' : 'text-encre-douce'}
            />
            <span
              className={`text-[10.5px] font-medium ${
                panneauActif || ouvert ? 'text-terracotta' : 'text-encre-douce'
              }`}
            >
              Plus
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
