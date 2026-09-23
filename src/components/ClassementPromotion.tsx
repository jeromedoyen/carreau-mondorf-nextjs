'use client';

import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ClassementPromotion as ClassementPromotionData } from '@/lib/data';
import { construireEvolutionPromotion } from '@/lib/promotionEvolution';
import { ClassementChart } from './ClassementChart';
import { CLUB_CARREAU_MONDORF } from '@/lib/types';

/** Un club marque avec ses trois meilleures équipes, quatre parties chacune,
 *  5 points la partie gagnée : 60 points au plus par journée. C'est l'échelle
 *  des barres — absolue, pour qu'une barre à moitié pleine veuille dire
 *  « la moitié du possible », pas « la moitié du meilleur ». */
const POINTS_MAX_JOURNEE = 60;
const HAUTEUR_BARRE_MAX = 110;

function ordinal(n: number) {
  return n === 1 ? '1er' : `${n}e`;
}

/** Le classement des clubs en Promotion, sur le modèle exact du National :
 *  graphique d'évolution des rangs (le même `ClassementChart`), classement
 *  à la journée pointée, puis le parcours de Carreau Mondorf journée par
 *  journée.
 *
 *  Une différence, dite à l'écran : aux journées où la FLBP a publié un
 *  classement, le rang est le sien ; ailleurs, il est **estimé** aux points
 *  (voir `construireEvolutionPromotion`). Les 4/4, qui départagent les
 *  égalités, ne sont connus que sur les classements publiés.
 *
 *  Toutes les valeurs sont écrites en clair, jamais seulement au survol. */
export function ClassementPromotion({ data }: { data: ClassementPromotionData }) {
  const evo = useMemo(() => construireEvolutionPromotion(data), [data]);
  const derniereJournee = evo.journees[evo.journees.length - 1] ?? 0;
  const [journee, setJournee] = useState(derniereJournee);

  if (!evo.journees.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucun classement publié par la fédération pour cette saison.
      </div>
    );
  }

  const journeeAffichee = evo.journees.includes(journee) ? journee : derniereJournee;
  const indexJournee = evo.journees.indexOf(journeeAffichee);
  const journeePrecedente = indexJournee > 0 ? evo.journees[indexJournee - 1] : null;

  const entrees = evo.clubs
    .map((club) => ({ club, pt: evo.evolution[club]?.find((p) => p.journee === journeeAffichee) }))
    .filter((e): e is { club: string; pt: NonNullable<typeof e.pt> } => !!e.pt)
    .sort((a, b) => a.pt.rang - b.pt.rang);
  const officiel = entrees.some((e) => e.pt.officiel);
  const estFinal = journeeAffichee === derniereJournee && officiel;
  const pointsMax = Math.max(...entrees.map((e) => e.pt.points), 1);

  const journeesMondorf = data.resultats
    .filter((r) => r.club === CLUB_CARREAU_MONDORF)
    .sort((a, b) => a.journee - b.journee);
  const deduites = journeesMondorf.filter((r) => r.deduit && r.jouee);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <h3 className="font-display m-0 mb-1 text-xl">Évolution du classement</h3>
        <p className="m-0 mb-3 text-[12.5px] text-encre-douce">
          {`Les ${evo.clubs.length} clubs de la Promotion, journée après journée. ` +
            (evo.journeesOfficielles.length > 0
              ? `Après les journées ${evo.journeesOfficielles.map((j) => `J${j}`).join(', ')}, le classement est celui publié par la FLBP ; aux autres, le rang est estimé aux points cumulés.`
              : 'Le rang est estimé aux points cumulés.')}
        </p>
        <ClassementChart data={evo} onJourneeChange={setJournee} />
        <div className="mt-3 flex flex-wrap gap-4 text-[11.5px] text-encre-douce">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3.5 rounded-sm bg-terracotta" />
            {CLUB_CARREAU_MONDORF}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3.5 rounded-sm bg-ligne" />
            Les {evo.clubs.length - 1} autres clubs
          </span>
        </div>
        <p className="m-0 mt-2 text-center text-[11.5px] text-encre-douce/60">
          Survolez ou touchez le graphique pour explorer une journée
        </p>
      </div>

      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display m-0 text-xl">
            {estFinal ? 'Classement final' : `Classement à l'issue de la journée ${journeeAffichee}`}
          </h3>
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
              officiel ? 'bg-pin/10 text-pin' : 'bg-sable text-encre-douce'
            }`}
          >
            {officiel ? 'Classement officiel FLBP' : 'Estimé aux points'}
          </span>
        </div>
        <p className="m-0 mb-4 text-[12.5px] text-encre-douce">
          {officiel
            ? 'À égalité de points, le départage se fait au nombre de 4/4 — les équipes qui ont gagné leurs quatre parties.'
            : 'La fédération n’a pas publié de classement après cette journée : les clubs sont rangés aux points, sans le départage au 4/4.'}
        </p>

        <div className="flex flex-col">
          {entrees.map((e) => {
            const estCM = e.club === CLUB_CARREAU_MONDORF;
            const avant =
              journeePrecedente !== null
                ? evo.evolution[e.club]?.find((p) => p.journee === journeePrecedente)
                : undefined;
            const monte = avant && e.pt.rang < avant.rang;
            const descend = avant && e.pt.rang > avant.rang;
            return (
              <div
                key={e.club}
                className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 border-t border-ligne py-2 text-[12.5px] first:border-t-0 sm:grid-cols-[26px_minmax(0,1.3fr)_minmax(0,1fr)_auto] ${
                  estCM ? 'font-semibold text-encre' : 'text-encre-douce'
                }`}
              >
                <span className="font-score text-base">{e.pt.rang}</span>
                {/* Pas de troncature : « Schierener Bulle… » ne se lit plus.
                    Le nom passe à la ligne si besoin ; le détail s'empile
                    sous les points sur mobile pour lui laisser la largeur. */}
                <span className={`leading-snug break-words ${estCM ? '' : 'text-encre'}`}>{e.club}</span>
                <span className="hidden h-[14px] overflow-hidden rounded-full bg-sable sm:block">
                  <span
                    className="block h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${(e.pt.points / pointsMax) * 100}%`,
                      background: estCM ? 'var(--terracotta)' : 'var(--ligne)',
                    }}
                  />
                </span>
                <span className="flex items-center justify-end gap-1.5 whitespace-nowrap text-[11.5px]">
                  <span className="flex flex-col items-end leading-tight sm:flex-row sm:items-center sm:gap-1.5">
                    <span className="font-score text-[13px] text-encre">{e.pt.points} pts</span>
                    <span className="text-[10.5px] opacity-70 sm:text-[11.5px]">
                      {e.pt.rencontres} j. · {e.pt.quatreQuatre ?? '—'}×4/4
                    </span>
                  </span>
                  {avant &&
                    (monte ? (
                      <TrendingUp size={13} className="text-pin" aria-label="en progression" />
                    ) : descend ? (
                      <TrendingDown size={13} className="text-danger" aria-label="en recul" />
                    ) : (
                      <Minus size={13} className="opacity-40" aria-label="même place" />
                    ))}
                </span>
              </div>
            );
          })}
        </div>
        <p className="m-0 mt-3 text-[11.5px] text-encre-douce/70">
          {(journeePrecedente !== null ? `Flèches : évolution depuis la journée ${journeePrecedente}. ` : '') +
            '« j. » : journées jouées · « —×4/4 » : décompte non publié à cette journée.'}
        </p>
      </div>

      {journeesMondorf.length > 0 && (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
          <h3 className="font-display m-0 mb-1 text-xl">{CLUB_CARREAU_MONDORF}, journée par journée</h3>
          <p className="m-0 mb-5 text-[12.5px] text-encre-douce">
            Points marqués par le club à chaque journée, sur {POINTS_MAX_JOURNEE} possibles : un club
            marque avec ses trois meilleures équipes. Sous chaque barre, la place du club ce jour-là.
          </p>
          {/* Hauteurs en pixels, pas en pourcentage : la colonne porte aussi la
              valeur et les libellés, une barre à 100 % de la colonne les
              chevaucherait. La zone de barre a sa hauteur propre. */}
          <div className="flex items-end gap-1 sm:gap-2">
            {journeesMondorf.map((r) => {
              const rang = r.jouee
                ? 1 +
                  data.resultats.filter(
                    (a) => a.journee === r.journee && a.jouee && (a.points ?? 0) > (r.points ?? 0)
                  ).length
                : null;
              const hauteur = r.jouee
                ? Math.max(Math.round(((r.points ?? 0) / POINTS_MAX_JOURNEE) * HAUTEUR_BARRE_MAX), 2)
                : 0;
              return (
                <div key={r.journee} className="flex min-w-0 flex-1 flex-col items-center">
                  <div
                    className="flex w-full flex-col items-center justify-end"
                    style={{ height: HAUTEUR_BARRE_MAX + 18 }}
                  >
                    <span className="mb-1 font-score text-[13px] leading-none text-encre">
                      {r.jouee ? r.points : '—'}
                      {r.deduit && r.jouee ? '*' : ''}
                    </span>
                    <span
                      className={`block w-full max-w-[34px] rounded-t-md ${
                        r.deduit ? 'border border-dashed border-terracotta bg-terracotta/35' : 'bg-terracotta'
                      }`}
                      style={{ height: hauteur }}
                    />
                  </div>
                  <span className="mt-1.5 text-[11px] text-encre-douce">J{r.journee}</span>
                  <span className="text-[10.5px] leading-tight text-encre-douce/70">
                    {rang ? ordinal(rang) : ' '}
                  </span>
                </div>
              );
            })}
          </div>
          {deduites.length > 0 && (
            <p className="m-0 mt-4 text-[11.5px] leading-relaxed text-encre-douce/80">
              {/* Phrase construite en chaîne : écrite en JSX, l'espace entre
                  l'expression et le deux-points disparaissait au rendu. Espace
                  insécable avant « : », comme le veut la typographie française. */}
              {`* ${deduites.map((r) => `J${r.journee}`).join(', ')} : résultats jamais publiés par la ` +
                'fédération. Points déduits de ses classements officiels — l’écart entre deux ' +
                'classements publiés, moins les journées connues entre les deux.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
