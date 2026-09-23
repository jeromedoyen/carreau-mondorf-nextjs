'use client';

import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ClassementPromotion as ClassementPromotionData } from '@/lib/data';
import { CLUB_CARREAU_MONDORF } from '@/lib/types';

/** Un club marque avec ses trois meilleures équipes, quatre parties chacune,
 *  5 points la partie gagnée : 60 points au plus par journée. C'est l'échelle
 *  des barres ci-dessous — une échelle absolue, pour qu'une barre à moitié
 *  pleine veuille dire « la moitié du possible », pas « la moitié du
 *  meilleur ». */
const POINTS_MAX_JOURNEE = 60;
const HAUTEUR_BARRE_MAX = 110;

/** Classement des clubs en Promotion, tel que publié par la FLBP, et le
 *  parcours de Carreau Mondorf journée par journée.
 *
 *  Toutes les valeurs sont écrites en clair, jamais seulement au survol —
 *  même principe que `ClassementBars` côté National D2. */
export function ClassementPromotion({ data }: { data: ClassementPromotionData }) {
  const { classements, resultats } = data;
  const [apresJournee, setApresJournee] = useState(
    classements[classements.length - 1]?.apresJournee ?? 0
  );

  if (!classements.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucun classement publié par la fédération pour cette saison.
      </div>
    );
  }

  const idx = classements.findIndex((c) => c.apresJournee === apresJournee);
  const courant = classements[idx] ?? classements[classements.length - 1];
  const precedent = idx > 0 ? classements[idx - 1] : null;
  const estFinal = courant === classements[classements.length - 1];
  const pointsMax = Math.max(...courant.lignes.map((l) => l.points), 1);

  const journeesMondorf = resultats
    .filter((r) => r.club === CLUB_CARREAU_MONDORF)
    .sort((a, b) => a.journee - b.journee);
  const deduites = journeesMondorf.filter((r) => r.deduit && r.jouee);

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display m-0 text-xl">
            {estFinal ? 'Classement final' : `Classement à l'issue de la journée ${courant.apresJournee}`}
          </h3>
          {classements.length > 1 && (
            <div className="flex gap-1.5" role="group" aria-label="Classement publié après la journée">
              {classements.map((c) => (
                <button
                  key={c.apresJournee}
                  type="button"
                  onClick={() => setApresJournee(c.apresJournee)}
                  aria-pressed={c.apresJournee === courant.apresJournee}
                  className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                    c.apresJournee === courant.apresJournee
                      ? 'bg-terracotta text-white'
                      : 'bg-sable text-encre-douce hover:text-encre'
                  }`}
                >
                  J{c.apresJournee}
                </button>
              ))}
            </div>
          )}
        </div>
        <p className="m-0 mb-4 text-[12.5px] text-encre-douce">
          {estFinal ? `Après ${courant.apresJournee} journées. ` : ''}
          Classement officiel publié par la FLBP, les quatorze clubs de la Promotion. À égalité de
          points, le départage se fait au nombre de 4/4 — les équipes qui ont gagné leurs quatre
          parties.
        </p>

        <div className="flex flex-col">
          {courant.lignes.map((l) => {
            const estCM = l.club === CLUB_CARREAU_MONDORF;
            const avant = precedent?.lignes.find((p) => p.club === l.club);
            const monte = avant && l.position < avant.position;
            const descend = avant && l.position > avant.position;
            return (
              <div
                key={l.club}
                className={`grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-3 border-t border-ligne py-2 text-[12.5px] first:border-t-0 sm:grid-cols-[26px_minmax(0,1.3fr)_minmax(0,1fr)_auto] ${
                  estCM ? 'font-semibold text-encre' : 'text-encre-douce'
                }`}
              >
                <span className="font-score text-base">{l.position}</span>
                {/* Pas de troncature : « Schierener Bullemettïen » coupé en
                    « Schierener Bulle… » ne se lit plus. Le nom passe à la ligne
                    si besoin ; le détail, lui, s'empile sous les points sur
                    mobile pour lui laisser la largeur. */}
                <span className={`leading-snug break-words ${estCM ? '' : 'text-encre'}`}>{l.club}</span>
                <span className="hidden h-[14px] overflow-hidden rounded-full bg-sable sm:block">
                  <span
                    className="block h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${(l.points / pointsMax) * 100}%`,
                      background: estCM ? 'var(--terracotta)' : 'var(--ligne)',
                    }}
                  />
                </span>
                <span className="flex items-center justify-end gap-1.5 whitespace-nowrap text-[11.5px]">
                  <span className="flex flex-col items-end leading-tight sm:flex-row sm:items-center sm:gap-1.5">
                    <span className="font-score text-[13px] text-encre">{l.points} pts</span>
                    <span className="text-[10.5px] opacity-70 sm:text-[11.5px]">
                      {l.rencontresJouees} j. · {l.quatreQuatre}×4/4
                    </span>
                  </span>
                  {precedent &&
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
        {precedent && (
          <p className="m-0 mt-3 text-[11.5px] text-encre-douce/70">
            Flèches : évolution depuis le classement publié après la journée {precedent.apresJournee}.
            « j. » : journées jouées.
          </p>
        )}
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
                  resultats.filter(
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
                    {rang ? (rang === 1 ? '1er' : `${rang}e`) : '\u00a0'}
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
              {`* ${deduites.map((r) => `J${r.journee}`).join(', ')}\u00a0: résultats jamais publiés par la ` +
                'fédération. Points déduits de ses classements officiels — l’écart entre deux ' +
                'classements publiés, moins les journées connues entre les deux.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
