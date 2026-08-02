'use client';

import { useId, useState } from 'react';

/** Petits graphiques SVG faits main pour les statistiques National D2 —
 *  même principe que le graphique de classement de poule de l'app v1
 *  (Competition.html : Chart.js retiré, SVG natif jugé plus léger et mieux
 *  maîtrisé visuellement). Une seule teinte par graphique (magnitude en
 *  terracotta, proportion victoires en pin) — pas de palette catégorielle
 *  à valider, cf. skill dataviz. */

/** Sparkline compacte "points par journée" pour une ligne de classement —
 *  barres fines, coin haut arrondi, ancrées à la base. Pas de graduation,
 *  c'est une lecture de forme ("ça monte/descend"), pas de valeurs exactes
 *  (celles-ci restent disponibles dans le panneau déplié). */
export function SparklinePoints({ valeurs, largeur = 64 }: { valeurs: number[]; largeur?: number }) {
  if (valeurs.length < 2) return null;
  const max = Math.max(...valeurs, 1);
  const hauteur = 22;
  const gap = 2;
  const largeurBarre = (largeur - gap * (valeurs.length - 1)) / valeurs.length;

  return (
    <svg
      width={largeur}
      height={hauteur}
      viewBox={`0 0 ${largeur} ${hauteur}`}
      className="shrink-0 opacity-80"
      aria-hidden="true"
    >
      {valeurs.map((v, i) => {
        const h = Math.max((v / max) * hauteur, v > 0 ? 3 : 1.5);
        return (
          <rect
            key={i}
            x={i * (largeurBarre + gap)}
            y={hauteur - h}
            width={largeurBarre}
            height={h}
            rx={Math.min(2, largeurBarre / 2)}
            className={v > 0 ? 'fill-terracotta' : 'fill-encre-douce/25'}
          />
        );
      })}
    </svg>
  );
}

/** Barre de proportion (victoires/parties jouées) — encodage par magnitude
 *  d'une seule teinte (rempli = pin, piste = sable), jamais par une paire
 *  de couleurs concurrentes : évite le problème de séparation CVD entre
 *  --pin et --danger (validé insuffisant par le script du skill dataviz).
 *  Valeur toujours en texte à côté, jamais la couleur seule. */
export function BarreProportion({
  victoires,
  joues,
  hauteur = 8,
}: {
  victoires: number;
  joues: number;
  hauteur?: number;
}) {
  const id = useId();
  const pct = joues > 0 ? victoires / joues : 0;
  return (
    <div className="flex w-full items-center gap-2">
      <div
        className="relative flex-1 overflow-hidden rounded-full bg-sable"
        style={{ height: hauteur }}
        role="img"
        aria-label={`${victoires} victoires sur ${joues} parties (${Math.round(pct * 100)}%)`}
      >
        <div
          key={id}
          className="absolute inset-y-0 left-0 rounded-full bg-pin transition-[width]"
          style={{ width: `${Math.max(pct * 100, victoires > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="w-[52px] shrink-0 text-right text-[12px] tabular-nums text-encre-douce">
        {victoires}/{joues}
      </span>
    </div>
  );
}

/** Graphique en barres "points par journée" pour le panneau déplié —
 *  version détaillée de SparklinePoints : axe des journées en repère,
 *  survol/tap pour la valeur exacte (chaque barre est son propre bouton,
 *  pas de tooltip flottant séparé — plus simple et tactile-friendly).
 *  Une seule série (terracotta), pas de légende nécessaire. */
export function GraphiquePointsParJournee({
  donnees,
}: {
  donnees: { journee: number; points: number }[];
}) {
  const [survol, setSurvol] = useState<number | null>(null);
  if (!donnees.length) return null;

  const max = Math.max(...donnees.map((d) => d.points), 1);
  const hauteur = 64;
  const largeurBarre = 22;
  const gap = 8;
  const largeur = donnees.length * largeurBarre + (donnees.length - 1) * gap;
  const actif = survol !== null ? donnees[survol] : null;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex h-4 items-center text-[11.5px] font-medium text-terracotta">
        {actif ? `Journée ${actif.journee} · ${actif.points} pts` : ' '}
      </div>
      <svg
        width={largeur}
        height={hauteur}
        viewBox={`0 0 ${largeur} ${hauteur}`}
        className="overflow-visible"
      >
        {donnees.map((d, i) => {
          const h = Math.max((d.points / max) * hauteur, d.points > 0 ? 4 : 2);
          const x = i * (largeurBarre + gap);
          const estSurvol = survol === i;
          return (
            <g
              key={d.journee}
              onMouseEnter={() => setSurvol(i)}
              onMouseLeave={() => setSurvol(null)}
              onFocus={() => setSurvol(i)}
              onBlur={() => setSurvol(null)}
              onTouchStart={() => setSurvol(i)}
              tabIndex={0}
              role="img"
              aria-label={`Journée ${d.journee} : ${d.points} points`}
              className="cursor-pointer outline-none"
            >
              <rect x={x} y={0} width={largeurBarre} height={hauteur} fill="transparent" />
              <rect
                x={x}
                y={hauteur - h}
                width={largeurBarre}
                height={h}
                rx={4}
                className={estSurvol ? 'fill-terracotta' : 'fill-terracotta/70'}
              />
            </g>
          );
        })}
      </svg>
      <div className="flex text-[10px] text-encre-douce/60" style={{ width: largeur }}>
        {donnees.map((d, i) => (
          <span
            key={d.journee}
            className="text-center"
            style={{ width: largeurBarre, marginRight: i < donnees.length - 1 ? gap : 0 }}
          >
            J{d.journee}
          </span>
        ))}
      </div>
    </div>
  );
}

const NB_JOUEURS_PAR_TYPE: Record<string, number> = { 'Tête à tête': 1, Doublette: 2, Triplette: 3 };

/** Petit repère visuel du type de partie (retour Jérôme, 02/08/2026 —
 *  note vocale #120 : "un gugus, deux gugus, trois gugus") sur la liste
 *  "toutes les parties" — un, deux ou trois pictogrammes de joueur selon
 *  tête-à-tête / doublette / triplette, pour une lecture visuelle
 *  immédiate sans avoir à lire le libellé texte. `currentColor` : hérite
 *  la couleur du texte voisin (victoire/défaite déjà codées ailleurs). */
export function IconeTypePartie({ type }: { type: string }) {
  const n = NB_JOUEURS_PAR_TYPE[type] ?? 0;
  if (!n) return null;
  return (
    <span className="inline-flex shrink-0 items-center gap-[1px]" title={type} aria-label={type}>
      {Array.from({ length: n }).map((_, i) => (
        <svg key={i} width="9" height="12" viewBox="0 0 9 12" fill="currentColor" aria-hidden="true">
          <circle cx="4.5" cy="2.6" r="2.2" />
          <path d="M0.5 11.5c0-2.8 1.8-4.4 4-4.4s4 1.6 4 4.4z" />
        </svg>
      ))}
    </span>
  );
}
