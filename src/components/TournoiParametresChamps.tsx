'use client';

import { useState } from 'react';
import type { FormatTournoi } from '@/lib/tournoi/moteur';
import type { ModePoule } from '@/lib/tournoi/poules';

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
  {
    valeur: 'poules' as const,
    titre: 'Poules',
    aide: 'Les équipes jouent en poules, puis les qualifiés disputent un tableau à élimination directe, et les éliminés une consolante.',
  },
];

export type ReglagesPoules = { mode: ModePoule; taille: number; qualifies: number; consolante: boolean };

/** Lit les réglages de poules dans le formulaire (champs `poules*`). */
export function lirePoulesDuFormulaire(fd: FormData): ReglagesPoules {
  return {
    mode: fd.get('poulesMode') === 'toutes_rondes' ? 'toutes_rondes' : 'repechage',
    taille: Number(fd.get('poulesTaille')) || 4,
    qualifies: Number(fd.get('poulesQualifies')) || 2,
    consolante: fd.get('poulesConsolante') === 'on',
  };
}

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
    poules?: ReglagesPoules | null;
  };
  format: FormatTournoi;
  onFormat: (f: FormatTournoi) => void;
  verrouille: boolean;
}) {
  const [modePoules, setModePoules] = useState<ModePoule>(defaut?.poules?.mode ?? 'repechage');
  const poules = format === 'poules';
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
        <div className="grid gap-2 sm:grid-cols-3">
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

      {poules && (
        <fieldset className="rounded-xl border border-ligne bg-sable p-3.5">
          <legend className="px-1 text-[11.5px] text-encre-douce">
            Réglages des poules {verrouille && '· verrouillés, la partie 1 est déjà composée'}
          </legend>
          {verrouille && (
            <>
              <input type="hidden" name="poulesMode" value={modePoules} />
              <input type="hidden" name="poulesTaille" value={defaut?.poules?.taille ?? 4} />
              <input type="hidden" name="poulesQualifies" value={defaut?.poules?.qualifies ?? 2} />
              {(defaut?.poules?.consolante ?? true) && <input type="hidden" name="poulesConsolante" value="on" />}
            </>
          )}
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              { v: 'repechage' as const, t: 'À repêchage', a: 'Poule de 4 : 1-2 et 3-4, puis gagnants entre eux, perdants entre eux, puis barrage. 2 qualifiés.' },
              { v: 'toutes_rondes' as const, t: 'Toutes rondes', a: 'Chaque équipe rencontre toutes les autres de sa poule.' },
            ].map((o) => (
              <label
                key={o.v}
                className={`rounded-lg border p-2.5 transition-colors ${verrouille ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                  modePoules === o.v ? 'border-terracotta bg-terracotta/6' : 'border-ligne bg-sable-carte'
                }`}
              >
                <input
                  type="radio"
                  name={verrouille ? 'poulesModeAffiche' : 'poulesMode'}
                  value={o.v}
                  checked={modePoules === o.v}
                  disabled={verrouille}
                  onChange={() => setModePoules(o.v)}
                  className="sr-only"
                />
                <span className="font-display block text-[13.5px]">{o.t}</span>
                <span className="mt-0.5 block text-[11.5px] leading-snug text-encre-douce">{o.a}</span>
              </label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-[11.5px] text-encre-douce">Équipes par poule</label>
              <select
                name={verrouille ? 'poulesTailleAffichee' : 'poulesTaille'}
                defaultValue={String(Math.min(defaut?.poules?.taille ?? 4, modePoules === 'repechage' ? 4 : 5))}
                disabled={verrouille}
                className={CHAMP}
              >
                <option value="3">3</option>
                <option value="4">4</option>
                {modePoules === 'toutes_rondes' && <option value="5">5</option>}
              </select>
            </div>
            {modePoules === 'toutes_rondes' && (
              <div>
                <label className="mb-1 block text-[11.5px] text-encre-douce">Qualifiés par poule</label>
                <select
                  name={verrouille ? 'poulesQualifiesAffiche' : 'poulesQualifies'}
                  defaultValue={String(defaut?.poules?.qualifies ?? 2)}
                  disabled={verrouille}
                  className={CHAMP}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </div>
            )}
            <label className="flex items-end gap-2 pb-2 text-[13px]">
              <input
                type="checkbox"
                name={verrouille ? 'poulesConsolanteAffichee' : 'poulesConsolante'}
                defaultChecked={defaut?.poules?.consolante ?? true}
                disabled={verrouille}
              />
              Une consolante pour les éliminés
            </label>
          </div>
        </fieldset>
      )}

      <div className={`grid grid-cols-2 gap-3 ${poules ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
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
        {poules ? (
          <input type="hidden" name="nbParties" value={1} />
        ) : (
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
        )}
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
