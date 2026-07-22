'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { StatistiquesD2 as StatistiquesD2Data } from '@/lib/types';

type TriColonne = 'tauxVictoire' | 'joues';

function formatPct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

const COLONNES: [TriColonne, string][] = [
  ['tauxVictoire', 'Taux de victoire'],
  ['joues', 'Parties jouées'],
];

/** Classement individuel triable + drill-down par joueur (par type de
 *  partie, historique récent) + bilan des binômes/trios — reprend le même
 *  regroupement que calculerStatistiquesJoueurs_() côté Apps Script
 *  (src/lib/stats.ts), juste réinterprété visuellement. */
export function StatistiquesD2({ stats }: { stats: StatistiquesD2Data }) {
  const [tri, setTri] = useState<TriColonne>('tauxVictoire');
  const [ouvert, setOuvert] = useState<string | null>(null);

  const joueursTries = useMemo(
    () =>
      [...stats.joueurs].sort((a, b) =>
        tri === 'tauxVictoire'
          ? b.tauxVictoire - a.tauxVictoire || b.joues - a.joues
          : b.joues - a.joues || b.tauxVictoire - a.tauxVictoire
      ),
    [stats.joueurs, tri]
  );

  if (!stats.joueurs.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucune donnée de partie détaillée importée pour l’instant — les
        statistiques individuelles s’afficheront ici une fois le détail des
        rencontres (« Parties championnat ») importé.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display m-0 text-xl">Classement individuel</h3>
          <div className="flex gap-1.5">
            {COLONNES.map(([cle, label]) => (
              <button
                key={cle}
                onClick={() => setTri(cle)}
                className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                  tri === cle
                    ? 'bg-terracotta text-white'
                    : 'bg-sable text-encre-douce hover:text-encre'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          {joueursTries.map((j, i) => {
            const estOuvert = ouvert === j.nom;
            return (
              <div key={j.nom} className="border-t border-ligne first:border-t-0">
                <button
                  onClick={() => setOuvert(estOuvert ? null : j.nom)}
                  className="grid w-full grid-cols-[28px_1fr_70px_90px_20px] items-center gap-3 py-2.5 text-left text-[13px] hover:bg-sable/60"
                >
                  <span className="font-score text-encre-douce/70">{i + 1}</span>
                  <span className="font-medium text-encre">{j.nom}</span>
                  <span className="text-encre-douce">{j.joues} j.</span>
                  <span className="font-score text-base text-terracotta">
                    {formatPct(j.tauxVictoire)}
                  </span>
                  {estOuvert ? (
                    <ChevronUp size={15} className="text-encre-douce/50" />
                  ) : (
                    <ChevronDown size={15} className="text-encre-douce/50" />
                  )}
                </button>
                {estOuvert && (
                  <div className="entree grid gap-4 border-t border-ligne bg-sable/40 px-2 py-4 sm:grid-cols-2">
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wide text-encre-douce/60">
                        Par type de partie
                      </p>
                      <div className="flex flex-col gap-1">
                        {Object.entries(j.parType).map(([type, t]) => (
                          <div
                            key={type}
                            className="flex items-center justify-between text-[12.5px]"
                          >
                            <span className="text-encre-douce">{type}</span>
                            <span className="text-encre">
                              {t.victoires}/{t.joues} (
                              {formatPct(t.joues ? t.victoires / t.joues : 0)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wide text-encre-douce/60">
                        Dernières parties
                      </p>
                      <div className="flex flex-col gap-1">
                        {j.parties.slice(0, 6).map((p) => (
                          <div
                            key={`${p.idRencontre}-${p.phase}-${p.type}`}
                            className="flex items-center justify-between gap-3 text-[12.5px]"
                          >
                            <span className="truncate text-encre-douce">
                              J{p.journee} · {formatDate(p.date)} · {p.adversaireClub}
                            </span>
                            <span className={p.gagne ? 'shrink-0 text-pin' : 'shrink-0 text-danger'}>
                              {p.scoreCM}-{p.scoreAdverse}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {stats.equipes.length > 0 && (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
          <h3 className="font-display m-0 mb-5 text-xl">Binômes &amp; trios</h3>
          <div className="flex flex-col">
            {stats.equipes.map((e) => (
              <div
                key={e.type + e.joueurs.join('+')}
                className="grid grid-cols-[1fr_110px_70px_90px] items-center gap-3 border-t border-ligne py-2.5 text-[13px] first:border-t-0"
              >
                <span className="text-encre">{e.joueurs.join(' + ')}</span>
                <span className="text-[11.5px] text-encre-douce">{e.type}</span>
                <span className="text-encre-douce">{e.joues} j.</span>
                <span className="font-score text-base text-terracotta">
                  {formatPct(e.tauxVictoire)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
