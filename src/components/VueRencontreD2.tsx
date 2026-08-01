import type { PartieExistante } from '@/lib/rencontreDetail';
import { pointsVictoirePartie, calculerRecapJournee } from '@/lib/stats';

/** Même gabarit des 4 phases FLBP que FeuilleDeMatch.tsx (dupliqué
 *  volontairement, comme pointsVictoirePartie l'est déjà entre stats.ts et
 *  matchSheet.ts — deux composants indépendants, pas besoin d'un import
 *  croisé pour une poignée de constantes). */
const GABARIT_PHASES: { phase: number; type: string }[] = [
  { phase: 1, type: 'Tête à tête' },
  { phase: 2, type: 'Triplette' },
  { phase: 3, type: 'Doublette' },
  { phase: 3, type: 'Tête à tête' },
  { phase: 4, type: 'Triplette' },
];

const LABEL_PHASE: Record<number, string> = {
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
  4: 'Phase 4',
};

/** Vue en lecture seule d'une feuille de match : structure des parties par
 *  phase, colonne de points, et récap "qui a marqué le plus" de la
 *  journée — pour un joueur ayant participé à cette rencontre (ou le CA/la
 *  commission sportive), sans les champs de saisie de FeuilleDeMatch.tsx
 *  (retour Jérôme via /pb, 01/08/2026). */
export function VueRencontreD2({ parties }: { parties: PartieExistante[] }) {
  const recap = calculerRecapJournee(
    parties.map((p) => ({
      phase: p.phase,
      type: p.type,
      joueurs_cm: p.joueursCM,
      score_cm: p.scoreCM,
      score_adverse: p.scoreAdverse,
    }))
  );
  const meilleurScore = recap[0]?.points ?? 0;

  const groupes = GABARIT_PHASES.map(({ phase, type }) => ({
    phase,
    type,
    lignes: parties.filter((p) => p.phase === phase && p.type === type).sort((a, b) => a.ordre - b.ordre),
  })).filter((g) => g.lignes.length > 0);

  if (!groupes.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-center text-[13.5px] text-encre-douce">
        Aucune partie détaillée saisie pour cette rencontre.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {recap.length > 0 && (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
          <h3 className="font-display m-0 mb-4 text-lg">Récap de la journée</h3>
          <div className="flex flex-col">
            {recap.map((j, i) => (
              <div
                key={j.nom}
                className="flex items-center justify-between gap-3 border-t border-ligne py-2 text-[13px] first:border-t-0"
              >
                <span className="flex items-center gap-2">
                  <span className="font-score w-6 text-encre-douce/70">{i + 1}</span>
                  <span className={j.points === meilleurScore && meilleurScore > 0 ? 'font-medium text-encre' : 'text-encre-douce'}>
                    {j.nom}
                  </span>
                </span>
                <span className="font-score text-terracotta">{j.points} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {groupes.map(({ phase, type, lignes }) => (
        <div
          key={`${phase}-${type}`}
          className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]"
        >
          <h3 className="font-display m-0 mb-4 text-lg">
            {LABEL_PHASE[phase]} — {type}
          </h3>
          <div className="overflow-x-auto">
            <div className="flex min-w-[560px] flex-col gap-2">
              {lignes.map((l) => {
                const joue = l.scoreCM !== null && l.scoreAdverse !== null;
                const gagne = joue && l.scoreCM! > l.scoreAdverse!;
                const points = joue ? (gagne ? pointsVictoirePartie(l.phase, l.type) : 0) : null;
                return (
                  <div
                    key={l.ordre}
                    className="grid grid-cols-[1fr_1fr_70px_50px] items-center gap-2 text-[13px]"
                  >
                    <span className="truncate text-encre">{l.joueursCM || '—'}</span>
                    <span className="truncate text-encre-douce">{l.joueursAdverse || '—'}</span>
                    <span className={`font-score text-center ${gagne ? 'text-pin' : 'text-danger'}`}>
                      {joue ? `${l.scoreCM} – ${l.scoreAdverse}` : '—'}
                    </span>
                    <span className="font-score text-center text-terracotta">
                      {points !== null ? `+${points}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
