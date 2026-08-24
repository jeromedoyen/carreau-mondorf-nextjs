'use client';

import type { FormatTournoi } from '@/lib/tournoi/moteur';

const CHAMP =
  'w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta disabled:cursor-not-allowed disabled:opacity-60';

const FORMATS = [
  {
    valeur: 'equipes_fixes' as const,
    titre: 'Équipes fixes',
    aide: 'Les équipes sont composées au départ et ne changent plus. Appariement par nombre de victoires. Classement par équipe.',
  },
  {
    valeur: 'melee' as const,
    titre: 'À la mêlée',
    aide: 'Les équipes sont retirées au sort à chaque partie parmi les joueurs. Classement individuel.',
  },
];

/**
 * Le jeu de champs Nom/Date/Format/Taille/Parties/Terrains/Points, partagé
 * entre la création (`NouveauTournoiForm`) et la modification
 * (`TournoiReglages`) — un seul endroit à faire évoluer si un champ change.
 *
 * `verrouille` grise format et taille d'équipe une fois la première partie
 * composée : les changer romprait la cohérence des équipes déjà tirées
 * (même règle que `modifierTournoi()` côté serveur, qui les refuse aussi).
 */
export function TournoiParametresChamps({
  defaut,
  format,
  onFormat,
  verrouille,
}: {
  defaut?: {
    nom: string;
    date: string;
    tailleEquipe: number;
    nbParties: number;
    nbTerrains: number;
    pointsVictoire: number;
  };
  format: FormatTournoi;
  onFormat: (f: FormatTournoi) => void;
  verrouille: boolean;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <input
          name="nom"
          required
          placeholder="Nom (ex. Cochon à la broche)"
          defaultValue={defaut?.nom}
          className={CHAMP}
        />
        <input type="date" name="date" required defaultValue={defaut?.date} className={CHAMP} />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[11.5px] text-encre-douce">
          Format {verrouille && '· verrouillé, la partie 1 est déjà composée'}
        </legend>
        {/* Un champ disabled est exclu de FormData au submit : le radio verrouillé
            bloque bien le clic, mais un hidden à côté porte la vraie valeur. */}
        {verrouille && <input type="hidden" name="format" value={format} />}
        <div className="grid gap-2 sm:grid-cols-2">
          {FORMATS.map((o) => (
            <label
              key={o.valeur}
              className={`rounded-xl border p-3 transition-colors ${verrouille ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                format === o.valeur ? 'border-terracotta bg-terracotta/6' : 'border-ligne bg-sable'
              }`}
            >
              <input
                type="radio"
                name="format"
                value={o.valeur}
                checked={format === o.valeur}
                disabled={verrouille}
                onChange={() => onFormat(o.valeur)}
                className="sr-only"
              />
              <span className="font-display block text-[14px]">{o.titre}</span>
              <span className="mt-0.5 block text-[11.5px] leading-snug text-encre-douce">{o.aide}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-[11.5px] text-encre-douce">Équipes</label>
          {/* Même règle que pour le format juste au-dessus : le select
              disabled n'est pas soumis, le hidden porte la valeur réelle. */}
          {verrouille && (
            <input type="hidden" name="tailleEquipe" value={defaut?.tailleEquipe ?? 3} />
          )}
          <select
            name="tailleEquipe"
            defaultValue={String(defaut?.tailleEquipe ?? 3)}
            disabled={verrouille}
            className={CHAMP}
          >
            <option value="1">Tête-à-tête</option>
            <option value="2">Doublettes</option>
            <option value="3">Triplettes</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] text-encre-douce">Parties</label>
          <input
            type="number"
            name="nbParties"
            min={1}
            max={12}
            defaultValue={defaut?.nbParties ?? 4}
            className={CHAMP}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] text-encre-douce">Terrains</label>
          <input
            type="number"
            name="nbTerrains"
            min={1}
            max={40}
            defaultValue={defaut?.nbTerrains ?? 6}
            className={CHAMP}
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] text-encre-douce">Partie en</label>
          <input
            type="number"
            name="pointsVictoire"
            min={7}
            max={21}
            defaultValue={defaut?.pointsVictoire ?? 13}
            className={CHAMP}
          />
        </div>
      </div>
    </>
  );
}
