'use client';

import { useMemo, useRef, useState } from 'react';
import type { ClassementDivisionD2 } from '@/lib/types';
import { CLUB_CARREAU_MONDORF } from '@/lib/types';

/**
 * Graphique de classement en EMPHASE : Carreau Mondorf en bleu épais avec son
 * nom en direct-label, les autres clubs en simple repère gris fin — plutôt
 * qu'une ligne par club en couleur catégorielle (7 couleurs à mémoriser pour
 * ne suivre qu'un seul club, jugé illisible lors du prototype Apps Script
 * équivalent). Largeur du tracé proportionnelle au nombre de journées (pas
 * fixe) : déborde naturellement de son cadre sur petit écran → défilement
 * horizontal natif, pas de curseur séparé à piloter.
 *
 * Survol/tap sur le tracé : ligne de curseur + infobulle avec le classement
 * complet de la journée pointée, et remonte la journée sélectionnée au parent
 * (`onJourneeChange`) pour synchroniser une vue "classement à cette journée"
 * à côté — jamais le seul moyen de lire une valeur (principe d'accessibilité :
 * un tooltip ne doit jamais être la seule façon de lire une donnée).
 */
export function ClassementChart({
  data,
  onJourneeChange,
}: {
  data: ClassementDivisionD2;
  onJourneeChange?: (journee: number) => void;
}) {
  const { journees, clubs, evolution } = data;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverJournee, setHoverJournee] = useState<number | null>(null);

  const derniereJournee = journees[journees.length - 1] ?? 1;
  const journeeAffichee = hoverJournee ?? derniereJournee;

  const layout = useMemo(() => {
    const nbClubs = clubs.length || 1;
    const padL = 28;
    const padR = 118;
    const padT = 14;
    const padB = 22;
    const pasX = 55;
    const plotW = Math.max((journees.length - 1) * pasX, 40);
    const plotH = 190;
    const w = padL + plotW + padR;
    const h = padT + plotH + padB;
    const x = (j: number) =>
      padL + (journees.indexOf(j) / Math.max(journees.length - 1, 1)) * plotW;
    const y = (r: number) =>
      padT + ((r - 1) / Math.max(nbClubs - 1, 1)) * plotH;
    return { padL, padR, padT, padB, plotW, plotH, w, h, x, y, nbClubs };
  }, [clubs.length, journees]);

  const { w, h, x, y, plotW, plotH, padL, padT, nbClubs } = layout;

  const evoCM = evolution[CLUB_CARREAU_MONDORF];

  function journeeAuPointeur(clientX: number): number {
    const svg = svgRef.current;
    if (!svg) return derniereJournee;
    const rect = svg.getBoundingClientRect();
    const scaleX = w / rect.width;
    const xSvg = (clientX - rect.left) * scaleX;
    const ratio = Math.min(Math.max((xSvg - padL) / plotW, 0), 1);
    const idx = Math.round(ratio * (journees.length - 1));
    return journees[Math.min(Math.max(idx, 0), journees.length - 1)];
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const journee = journeeAuPointeur(e.clientX);
    setHoverJournee(journee);
    onJourneeChange?.(journee);
  }

  function handlePointerLeave() {
    setHoverJournee(null);
    onJourneeChange?.(derniereJournee);
  }

  const entreesTooltip = useMemo(() => {
    return clubs
      .map((c) => ({ club: c, pt: evolution[c]?.find((p) => p.journee === journeeAffichee) }))
      .filter((e): e is { club: string; pt: NonNullable<typeof e.pt> } => !!e.pt)
      .sort((a, b) => a.pt.rang - b.pt.rang);
  }, [clubs, evolution, journeeAffichee]);

  return (
    <div className="relative overflow-x-auto pb-1">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${w} ${h}`}
        width={w}
        height={h}
        style={{ minWidth: w }}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="block cursor-crosshair"
      >
        {/* grille de rang + axe des journées */}
        {Array.from({ length: nbClubs }, (_, i) => i + 1).map((r) => (
          <g key={r}>
            <line
              x1={padL}
              y1={y(r)}
              x2={padL + plotW}
              y2={y(r)}
              stroke="var(--ligne, #E7E5DE)"
              strokeWidth={1}
            />
            <text
              x={padL - 8}
              y={y(r) + 3}
              textAnchor="end"
              fontSize={9.5}
              fill="var(--gris-clair, #8b8a84)"
            >
              {r}
            </text>
          </g>
        ))}
        {journees.map((j) => (
          <text
            key={j}
            x={x(j)}
            y={h - 6}
            textAnchor="middle"
            fontSize={9.5}
            fill="var(--gris-clair, #8b8a84)"
          >
            J{j}
          </text>
        ))}

        {/* lignes de contexte (les autres clubs) */}
        {clubs
          .filter((c) => c !== CLUB_CARREAU_MONDORF)
          .map((c) => {
            const pts = (evolution[c] ?? [])
              .map((pt) => `${x(pt.journee)},${y(pt.rang)}`)
              .join(' ');
            return (
              <polyline
                key={c}
                points={pts}
                fill="none"
                stroke="var(--gris-clair, #8b8a84)"
                strokeWidth={1.5}
                opacity={0.7}
              />
            );
          })}

        {/* ligne Carreau Mondorf, en emphase */}
        {evoCM && evoCM.length > 0 && (
          <>
            <polyline
              points={evoCM.map((pt) => `${x(pt.journee)},${y(pt.rang)}`).join(' ')}
              fill="none"
              stroke="var(--bleu, #0192D3)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {evoCM.map((pt) => (
              <circle
                key={pt.journee}
                cx={x(pt.journee)}
                cy={y(pt.rang)}
                r={3.5}
                fill="var(--bleu, #0192D3)"
              />
            ))}
            <text
              x={padL + plotW + 8}
              y={y(evoCM[evoCM.length - 1].rang) + 4}
              fontSize={11.5}
              fontWeight={700}
              fill="var(--encre, #1A1A17)"
            >
              Carreau Mondorf
            </text>
          </>
        )}

        {/* curseur de journée survolée */}
        {hoverJournee != null && (
          <line
            x1={x(hoverJournee)}
            y1={padT}
            x2={x(hoverJournee)}
            y2={padT + plotH}
            stroke="var(--bleu, #0192D3)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.5}
            pointerEvents="none"
          />
        )}
      </svg>

      {hoverJournee != null && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg bg-[var(--encre,#1A1A17)] px-2.5 py-2 text-[11.5px] leading-relaxed text-white">
          <strong>Journée {journeeAffichee}</strong>
          <br />
          {entreesTooltip.map((e) => (
            <div key={e.club}>
              {e.pt.rang}. {e.club}
              {e.club === CLUB_CARREAU_MONDORF ? ' •' : ''}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
