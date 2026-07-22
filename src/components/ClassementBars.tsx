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
    <div>
      {entrees.map((e) => {
        const ptPrec = data.evolution[e.club]?.find((p) => p.journee === journee - 1);
        const tendance = !ptPrec ? '' : e.pt.rang < ptPrec.rang ? '▲' : e.pt.rang > ptPrec.rang ? '▼' : '▬';
        const pct = (Math.abs(e.pt.diff) / maxAbs) * 100;
        const estCM = e.club === CLUB_CARREAU_MONDORF;
        const couleur = estCM ? 'var(--bleu)' : 'var(--gris-clair)';
        return (
          <div
            key={e.club}
            className={`grid grid-cols-[22px_1fr_2fr_90px] items-center gap-2.5 py-1 text-[12.5px] ${estCM ? 'font-semibold' : ''}`}
          >
            <span className="font-[family-name:var(--font-oswald)] text-[var(--gris-txt)]">
              {e.pt.rang}
            </span>
            <span>{e.club}</span>
            <span className="block h-[18px] overflow-hidden rounded-md bg-[var(--fond)]">
              <span
                className="block h-full rounded-md"
                style={{ width: `${pct}%`, background: couleur }}
              />
            </span>
            <span>
              {e.pt.diff > 0 ? '+' : ''}
              {e.pt.diff} <span className="opacity-60">{tendance}</span> · {e.pt.victoires}V{' '}
              {e.pt.defaites}D
            </span>
          </div>
        );
      })}
    </div>
  );
}
