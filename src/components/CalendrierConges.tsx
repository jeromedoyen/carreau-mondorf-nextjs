'use client';

import { useMemo, useState } from 'react';
import { MEMBRES_CA } from '@/lib/membresCA';
import type { Conge } from '@/lib/conges';
import type { ItemCalendrier } from '@/lib/data';

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const JOURS_COURTS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

const COULEUR_MOTIF: Record<string, string> = {
  Vacances: 'bg-marine text-white',
  Indisponible: 'bg-laiton text-white',
};
const COULEUR_MOTIF_DEFAUT = 'bg-encre-douce/50 text-white';

/** Grille mensuelle "qui est absent quand" — port de la Vue calendrier de
 *  Conges.html (app v1) : une ligne par membre du CA, une colonne par jour
 *  du mois choisi, cellule teintée par motif de congé, et une pastille sur
 *  l'en-tête du jour pour chaque manifestation/journée de championnat qui
 *  tombe ce jour-là (le CA doit voir d'un coup d'œil qui est dispo pour
 *  organiser/accueillir). Pense-bête Jérôme #20, 26/07/2026 : "il me faut
 *  une visualisation" — la liste seule (ListeConges.tsx) ne suffisait pas
 *  à répondre à cette question-là. */
export function CalendrierConges({
  saison,
  conges,
  evenements,
}: {
  saison: string;
  conges: Conge[];
  evenements: ItemCalendrier[];
}) {
  const anneeDefaut = Number(saison) || new Date().getFullYear();
  const moisDefaut = new Date().getFullYear() === anneeDefaut ? new Date().getMonth() : 0;
  const [moisChoisi, setMoisChoisi] = useState(moisDefaut);

  const joursDansMois = new Date(anneeDefaut, moisChoisi + 1, 0).getDate();
  const jours = useMemo(() => Array.from({ length: joursDansMois }, (_, i) => i + 1), [joursDansMois]);

  function dateISO(jour: number) {
    return `${anneeDefaut}-${String(moisChoisi + 1).padStart(2, '0')}-${String(jour).padStart(2, '0')}`;
  }

  function evenementsDuJour(iso: string) {
    return evenements.filter((e) => e.date <= iso && iso <= e.dateFin);
  }

  function congeDuJour(nom: string, iso: string) {
    return conges.find((c) => c.personne === nom && c.dateDebut <= iso && iso <= c.dateFin);
  }

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[15px]">Vue calendrier</h2>
        <select
          value={moisChoisi}
          onChange={(e) => setMoisChoisi(Number(e.target.value))}
          className="rounded-lg border border-ligne bg-sable px-3 py-1.5 text-[13px] outline-none focus:border-terracotta"
        >
          {MOIS_NOMS.map((nom, i) => (
            <option key={nom} value={i}>
              {nom} {anneeDefaut}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-[11px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[140px] bg-sable-carte px-2.5 py-1.5 text-left font-medium text-encre-douce">
                Membre du CA
              </th>
              {jours.map((j) => {
                const iso = dateISO(j);
                const jourSemaine = new Date(anneeDefaut, moisChoisi, j).getDay();
                const weekend = jourSemaine === 0 || jourSemaine === 6;
                const evtsJour = evenementsDuJour(iso);
                return (
                  <th
                    key={j}
                    title={evtsJour.map((e) => e.titre).join(', ')}
                    className={`w-[22px] border border-ligne px-0 py-1 text-center font-normal ${weekend ? 'bg-sable' : ''}`}
                  >
                    <div>{j}</div>
                    <div className="text-encre-douce/60">{JOURS_COURTS[jourSemaine]}</div>
                    {evtsJour.length > 0 && (
                      <div className="mt-0.5 flex justify-center gap-0.5">
                        {evtsJour.slice(0, 3).map((e, i) => (
                          <span
                            key={i}
                            className="h-[4px] w-[4px] rounded-full"
                            style={{
                              background:
                                e.categorie === 'National D2'
                                  ? 'var(--marine)'
                                  : e.categorie === 'Promotion'
                                    ? 'var(--pin)'
                                    : 'var(--terracotta)',
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {MEMBRES_CA.map((m) => (
              <tr key={m.nom}>
                <td className="sticky left-0 z-10 min-w-[140px] whitespace-nowrap bg-sable-carte px-2.5 py-1.5 text-left font-medium text-encre">
                  {m.nom}
                </td>
                {jours.map((j) => {
                  const iso = dateISO(j);
                  const jourSemaine = new Date(anneeDefaut, moisChoisi, j).getDay();
                  const weekend = jourSemaine === 0 || jourSemaine === 6;
                  const conge = congeDuJour(m.nom, iso);
                  return (
                    <td
                      key={j}
                      title={conge ? `${conge.motif ?? ''}${conge.note ? ' — ' + conge.note : ''}` : undefined}
                      className={`h-[26px] w-[22px] border border-ligne ${
                        conge ? COULEUR_MOTIF[conge.motif ?? ''] ?? COULEUR_MOTIF_DEFAUT : weekend ? 'bg-sable' : ''
                      }`}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-encre-douce">
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3.5 w-3.5 rounded bg-marine" />
          Vacances
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-3.5 w-3.5 rounded bg-laiton" />
          Indisponible
        </span>
        <span className="flex items-center gap-1.5">
          <i className="inline-block h-[6px] w-[6px] rounded-full" style={{ background: 'var(--terracotta)' }} />
          Manifestation/fédération
          <i className="ml-2 inline-block h-[6px] w-[6px] rounded-full" style={{ background: 'var(--marine)' }} />
          National D2
          <i className="ml-2 inline-block h-[6px] w-[6px] rounded-full" style={{ background: 'var(--pin)' }} />
          Promotion
        </span>
      </div>
    </div>
  );
}
