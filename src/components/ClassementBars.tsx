import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ClassementDivisionD2 } from '@/lib/types';
import { CLUB_CARREAU_MONDORF } from '@/lib/types';

/** Classement détaillé (rang, tendance, différence, V/D) pour une journée
 *  donnée — reste toujours affiché (pas seulement au survol du graphique),
 *  conformément au principe "un tooltip ne doit jamais être le seul moyen
 *  de lire une valeur". */
export function ClassementBars({
  data,
  journee,
}: {
  data: ClassementDivisionD2;
  journee: number;
}) {
  const entrees = data.clubs
    .map((club) => ({ club, pt: data.evolution[club]?.find((p) => p.journee === journee) }))
    .filter((e): e is { club: string; pt: NonNullable<typeof e.pt> } => !!e.pt)
    .sort((a, b) => a.pt.rang - b.pt.rang);

  const maxAbs = Math.max(...entrees.map((e) => Math.abs(e.pt.diff)), 1);

  return (
    <div className="flex flex-col">
      {entrees.map((e) => {
        const ptPrec = data.evolution[e.club]?.find((p) => p.journee === journee - 1);
        const monte = ptPrec && e.pt.rang < ptPrec.rang;
        const descend = ptPrec && e.pt.rang > ptPrec.rang;
        const pct = (Math.abs(e.pt.diff) / maxAbs) * 100;
        const estCM = e.club === CLUB_CARREAU_MONDORF;
        return (
          <div
            key={e.club}
            className={`grid grid-cols-[26px_1fr_2fr_100px] items-center gap-3 border-t border-ligne py-2 text-[12.5px] first:border-t-0 ${estCM ? 'font-semibold text-encre' : 'text-encre-douce'}`}
          >
            <span className="font-score text-base">{e.pt.rang}</span>
            <span className={estCM ? '' : 'text-encre'}>{e.club}</span>
            <span className="block h-[16px] overflow-hidden rounded-full bg-sable">
              <span
                className="block h-full rounded-full transition-[width] duration-500"
                style={{ width: `${pct}%`, background: estCM ? 'var(--terracotta)' : 'var(--ligne)' }}
              />
            </span>
            <span className="flex items-center gap-1.5 text-[11.5px]">
              {e.pt.diff > 0 ? '+' : ''}
              {e.pt.diff} · {e.pt.victoires}V {e.pt.defaites}D
              {monte && <TrendingUp size={13} className="text-pin" />}
              {descend && <TrendingDown size={13} className="text-danger" />}
              {!monte && !descend && ptPrec && <Minus size={13} className="opacity-40" />}
            </span>
          </div>
        );
      })}
    </div>
  );
}
