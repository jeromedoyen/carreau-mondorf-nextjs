'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Manifestation } from '@/lib/manifestations';
import type { ItemCalendrier } from '@/lib/data';

const MOIS_NOMS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];
const JOURS_SEMAINE = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/** ISO locale (pas d.toISOString(), qui convertit en UTC et décale d'un
 *  jour pour un fuseau en avance sur UTC comme Europe/Luxembourg — bug
 *  réel signalé par Jérôme, note vocale du 02/08/2026 : "Amicale des
 *  Français" 8-9 août affichée dans les cases du 9-10). */
function versISOLocale(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATUT_COULEUR: Record<string, string> = {
  Planifiée: 'bg-marine/15 text-marine',
  Confirmée: 'bg-pin/15 text-pin',
  Annulée: 'bg-danger/15 text-danger',
  Terminée: 'bg-encre-douce/15 text-encre-douce',
};

/** Grille mensuelle des manifestations — port de la page "Calendrier" de
 *  Evenements.html (app v1) : semaines en lignes (Lun→Dim), une puce par
 *  manifestation ce jour-là (cliquable, vers son détail), plus les
 *  rencontres D2/journées Promotion en repère visuel — même principe que
 *  CalendrierConges.tsx, adapté à un mois plutôt qu'à une liste de
 *  personnes. Retour Jérôme, 26/07/2026 : "il y a aussi un calendrier dans
 *  manifestations [en v1]". */
export function CalendrierManifestations({
  manifestations,
  evenementsChampionnat,
}: {
  manifestations: Manifestation[];
  evenementsChampionnat: ItemCalendrier[];
}) {
  const aujourdhui = new Date();
  const premiereManif = manifestations
    .map((m) => m.dateDebut)
    .sort()
    .find((d) => d >= versISOLocale(aujourdhui));
  const depart = premiereManif ? new Date(premiereManif + 'T00:00:00') : aujourdhui;

  const [annee, setAnnee] = useState(depart.getFullYear());
  const [mois, setMois] = useState(depart.getMonth());

  function changerMois(delta: number) {
    const d = new Date(annee, mois + delta, 1);
    setAnnee(d.getFullYear());
    setMois(d.getMonth());
  }

  const semaines = useMemo(() => {
    const premierJourMois = new Date(annee, mois, 1);
    const decalage = (premierJourMois.getDay() + 6) % 7; // lundi = 0
    const joursDansMois = new Date(annee, mois + 1, 0).getDate();
    const totalCellules = Math.ceil((decalage + joursDansMois) / 7) * 7;

    const cellules = Array.from({ length: totalCellules }, (_, i) => {
      const numJour = i - decalage + 1;
      const d = new Date(annee, mois, numJour);
      const iso = versISOLocale(d);
      const horsMois = numJour < 1 || numJour > joursDansMois;
      const estAujourdhui = iso === versISOLocale(aujourdhui);
      const manifsJour = manifestations.filter((m) => m.dateDebut <= iso && iso <= m.dateFin);
      const champJour = evenementsChampionnat.filter((e) => e.date <= iso && iso <= e.dateFin);
      return { jour: d.getDate(), horsMois, estAujourdhui, manifsJour, champJour };
    });

    const lignes = [];
    for (let i = 0; i < cellules.length; i += 7) lignes.push(cellules.slice(i, i + 7));
    return lignes;
  }, [annee, mois, manifestations, evenementsChampionnat]);

  return (
    <div className="mb-8 rounded-2xl border border-ligne bg-sable-carte p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-display text-[15px]">Vue calendrier</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changerMois(-1)}
            aria-label="Mois précédent"
            className="rounded-lg border border-ligne p-1 text-encre-douce hover:border-terracotta hover:text-terracotta"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="w-32 text-center text-[13.5px] font-medium">
            {MOIS_NOMS[mois]} {annee}
          </span>
          <button
            type="button"
            onClick={() => changerMois(1)}
            aria-label="Mois suivant"
            className="rounded-lg border border-ligne p-1 text-encre-douce hover:border-terracotta hover:text-terracotta"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 text-[11px]">
        {JOURS_SEMAINE.map((n) => (
          <div key={n} className="px-1 text-center font-medium text-encre-douce/70">
            {n}
          </div>
        ))}
        {semaines.map((semaine, i) =>
          semaine.map((c, j) => (
            <div
              key={`${i}-${j}`}
              className={`min-h-[64px] rounded-lg border border-ligne p-1 ${
                c.horsMois ? 'bg-sable/40 text-encre-douce/30' : ''
              } ${c.estAujourdhui ? 'border-terracotta' : ''}`}
            >
              <div className="text-[11px] font-medium">{c.jour}</div>
              <div className="mt-0.5 flex flex-col gap-0.5">
                {c.manifsJour.slice(0, 2).map((m) => (
                  <Link
                    key={m.id}
                    href={`/manifestations/${m.id}`}
                    title={m.nom}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                      STATUT_COULEUR[m.statut] ?? 'bg-encre-douce/15 text-encre-douce'
                    }`}
                  >
                    {m.nom}
                  </Link>
                ))}
                {c.manifsJour.length > 2 && (
                  <span className="text-[10px] text-encre-douce">+{c.manifsJour.length - 2} autre(s)</span>
                )}
                {c.champJour.map((e, k) => (
                  <span
                    key={k}
                    title={e.titre}
                    className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                      e.categorie === 'National D2' ? 'bg-marine/10 text-marine' : 'bg-pin/10 text-pin'
                    }`}
                  >
                    {e.titre}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
