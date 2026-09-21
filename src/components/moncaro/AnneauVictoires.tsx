/* Répartition victoires / défaites. Deux teintes seulement — `pin` pour
 * les victoires, `ligne` pour le reste — et surtout pas de rouge : une
 * défaite au jeu de boules n'est pas une anomalie à signaler.
 *
 * L'anneau est décoratif au sens de l'accessibilité : les mêmes chiffres
 * sont écrits juste à côté, en clair. Un lecteur d'écran n'a donc rien à
 * lire dans le SVG, et l'information ne repose jamais sur la seule couleur. */
export function AnneauVictoires({
  victoires,
  defaites,
  taille = 132,
}: {
  victoires: number;
  defaites: number;
  taille?: number;
}) {
  const total = victoires + defaites;
  const rayon = taille / 2 - 11;
  const circonference = 2 * Math.PI * rayon;
  const partVictoires = total > 0 ? victoires / total : 0;
  const pourcentage = Math.round(partVictoires * 100);

  return (
    <div className="flex items-center gap-5">
      <div className="relative shrink-0" style={{ width: taille, height: taille }}>
        <svg width={taille} height={taille} viewBox={`0 0 ${taille} ${taille}`} aria-hidden="true">
          <circle
            cx={taille / 2}
            cy={taille / 2}
            r={rayon}
            fill="none"
            stroke="var(--ligne)"
            strokeWidth="11"
          />
          {total > 0 && (
            <circle
              cx={taille / 2}
              cy={taille / 2}
              r={rayon}
              fill="none"
              stroke="var(--pin)"
              strokeWidth="11"
              strokeLinecap="round"
              strokeDasharray={`${circonference * partVictoires} ${circonference}`}
              transform={`rotate(-90 ${taille / 2} ${taille / 2})`}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-score text-[30px] leading-none text-encre">{pourcentage}%</span>
          <span className="text-[10px] uppercase tracking-wide text-encre-douce/70">victoires</span>
        </div>
      </div>

      <dl className="min-w-0 space-y-2.5">
        <div className="flex items-baseline gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-pin" aria-hidden="true" />
          <dt className="text-[12.5px] text-encre-douce">Gagnées</dt>
          <dd className="font-score text-[17px] text-encre">{victoires}</dd>
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-ligne" aria-hidden="true" />
          <dt className="text-[12.5px] text-encre-douce">Perdues</dt>
          <dd className="font-score text-[17px] text-encre">{defaites}</dd>
        </div>
        <div className="flex items-baseline gap-2.5 border-t border-ligne pt-2">
          <span className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
          <dt className="text-[12.5px] text-encre-douce">Jouées</dt>
          <dd className="font-score text-[17px] text-encre">{total}</dd>
        </div>
      </dl>
    </div>
  );
}
