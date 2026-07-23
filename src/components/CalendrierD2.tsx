'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, Plane } from 'lucide-react';
import type { RencontreD2 } from '@/lib/data';
import { createClient } from '@/lib/supabase/client';

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

/** Le check CA se fait côté client (pas dans la page Server Component, qui
 *  doit rester statique pour la vitesse — même raison que AuthNavLink.tsx) :
 *  les liens "Saisir/Modifier" n'apparaissent qu'après hydratation, une fois
 *  le statut confirmé. */
export function CalendrierD2({ rencontres }: { rencontres: RencontreD2[] }) {
  const [estCA, setEstCA] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.rpc('est_membre_ca').then(({ data }) => setEstCA(!!data));
  }, []);

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      <h3 className="font-display m-0 mb-5 text-xl">Calendrier &amp; résultats</h3>
      <div className="flex flex-col">
        {rencontres.map((r) => {
          const forfait = r.statut === 'ForfaitCM' || r.statut === 'ForfaitAdverse';
          const joue = r.statut === 'Jouée' || forfait;
          const exempt = r.statut === 'Exempt';
          const gagne = joue && r.scoreCM! > r.scoreAdverse!;
          return (
            <div
              key={r.journee}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-ligne py-3 text-[13.5px] first:border-t-0 hover:bg-sable/60"
            >
              <div className="flex items-center gap-3">
                <span className="font-score w-9 shrink-0 text-encre-douce/70">J{r.journee}</span>
                <span className="w-11 shrink-0 text-encre-douce">{formatDate(r.date)}</span>
                {exempt ? (
                  <span className="italic text-encre-douce/60">Exempt ce tour-ci</span>
                ) : (
                  <span className="flex items-center gap-2">
                    {r.domicile ? (
                      <Home size={14} className="shrink-0 text-pin" />
                    ) : (
                      <Plane size={14} className="shrink-0 text-encre-douce/50" />
                    )}
                    <span className={r.statut === 'Prévue' ? 'text-encre-douce/60' : 'font-medium'}>
                      {r.adversaire}
                    </span>
                  </span>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                {joue ? (
                  <span className="flex items-center gap-2">
                    {forfait && (
                      <span className="text-[11px] uppercase tracking-wide text-danger">Forfait</span>
                    )}
                    <span
                      className={`font-score rounded-lg px-3 py-1 text-base ${
                        gagne ? 'bg-pin/10 text-pin' : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {r.scoreCM} – {r.scoreAdverse}
                    </span>
                  </span>
                ) : !exempt ? (
                  <span className="text-[12px] uppercase tracking-wide text-encre-douce/50">
                    à venir
                  </span>
                ) : null}
                {estCA && !exempt && (
                  <Link
                    href={`/national-d2/rencontres/${r.id}`}
                    className="text-[12px] text-terracotta underline hover:opacity-80"
                  >
                    {joue ? 'Modifier' : 'Saisir'}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
