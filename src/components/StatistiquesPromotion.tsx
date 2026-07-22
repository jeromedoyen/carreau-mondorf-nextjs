'use client';

import { useMemo, useState } from 'react';
import type { StatistiquesPromotion as StatistiquesPromotionData } from '@/lib/types';

type TriColonne = 'tauxVictoire' | 'participations';

function formatPct(v: number) {
  return `${Math.round(v * 100)}%`;
}

const COLONNES: [TriColonne, string][] = [
  ['tauxVictoire', 'Taux de victoire'],
  ['participations', 'Journées jouées'],
];

/** Pas de drill-down par partie ici (contrairement au National D2) : seul le
 *  bilan du trio par journée a été importé, pas le détail individuel — voir
 *  le commentaire de getStatistiquesPromotion() dans src/lib/stats.ts. */
export function StatistiquesPromotion({ stats }: { stats: StatistiquesPromotionData }) {
  const [tri, setTri] = useState<TriColonne>('tauxVictoire');

  const joueursTries = useMemo(
    () =>
      [...stats.joueurs].sort((a, b) =>
        tri === 'tauxVictoire'
          ? b.tauxVictoire - a.tauxVictoire || b.participations - a.participations
          : b.participations - a.participations || b.tauxVictoire - a.tauxVictoire
      ),
    [stats.joueurs, tri]
  );

  if (!stats.joueurs.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucune équipe importée pour cette saison.
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
          {joueursTries.map((j, i) => (
            <div
              key={j.nom}
              className="grid grid-cols-[28px_1fr_110px_70px] items-center gap-3 border-t border-ligne py-2.5 text-[13px] first:border-t-0"
            >
              <span className="font-score text-encre-douce/70">{i + 1}</span>
              <span className="font-medium text-encre">{j.nom}</span>
              <span className="text-encre-douce">
                {j.participations} journée{j.participations > 1 ? 's' : ''}
              </span>
              <span className="font-score text-base text-terracotta">
                {formatPct(j.tauxVictoire)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {stats.trios.length > 0 && (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
          <h3 className="font-display m-0 mb-5 text-xl">Bilan par trio</h3>
          <div className="flex flex-col">
            {stats.trios.map((t) => (
              <div
                key={t.joueurs.join('+')}
                className="grid grid-cols-[1fr_110px_70px] items-center gap-3 border-t border-ligne py-2.5 text-[13px] first:border-t-0"
              >
                <span className="text-encre">{t.joueurs.join(' + ')}</span>
                <span className="text-encre-douce">
                  {t.participations} journée{t.participations > 1 ? 's' : ''}
                </span>
                <span className="font-score text-base text-terracotta">
                  {formatPct(t.tauxVictoire)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
