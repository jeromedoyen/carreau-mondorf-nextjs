'use client';

import { useMemo } from 'react';
import { DayPilot, DayPilotScheduler } from '@daypilot/daypilot-lite-react';
import { Printer } from 'lucide-react';
import { CATEGORIES_CRENEAU, couleurCategorie } from '@/lib/categoriesCreneau';
import type { Creneau } from '@/lib/manifestations';

/** Planning visuel des créneaux d'une manifestation (26/07/2026, demande
 *  Jérôme) — une timeline horaire par jour (DayPilot Lite, Apache-2.0,
 *  https://github.com/DayPilotCode/daypilot-react-scheduler-open-source),
 *  une ligne par tâche, barres colorées par catégorie : même esprit que le
 *  planning imprimé produit à la main pour le concours Vitali-Brunetta
 *  (Planning_benevoles_Concours_Vitali-Brunetta.pdf). Vient EN COMPLÉMENT
 *  de la liste des créneaux existante (édition), pas à sa place — cette
 *  vue est faite pour visualiser/imprimer, pas pour saisir. */

function formatJour(date: string) {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase();
}

/** Convertit "HH:MM" + date en DayPilot.Date. Sans heure de fin : bloc de
 *  15 min si l'horaire est un simple point (ex. "Remise des prix 17h",
 *  comme les repères ◆ du PDF) ; bloc de 1h si l'horaire est volontairement
 *  imprécis (ex. "8h → fin à préciser"), avec "…" dans le libellé. */
function creneauVersEvenement(c: Creneau) {
  if (!c.heureDebut) return null;
  const debut = new DayPilot.Date(`${c.date}T${c.heureDebut}:00`);
  let fin: DayPilot.Date;
  let suffixe = '';
  if (c.heureFin) {
    fin = new DayPilot.Date(`${c.date}T${c.heureFin}:00`);
  } else if (c.finImprecise) {
    fin = debut.addHours(1);
    suffixe = '…';
  } else {
    fin = debut.addMinutes(15);
  }

  const noms = c.affectations.map((a) => a.nom).join(', ');
  const texte = noms ? `${c.tache}${suffixe} — ${noms}` : `${c.tache}${suffixe}`;

  return {
    id: c.id,
    resource: c.tache,
    start: debut,
    end: fin,
    text: texte,
    backColor: couleurCategorie(c.categorie),
    fontColor: '#fff',
    borderColor: 'darker',
  };
}

function PlanningJour({ date, creneaux }: { date: string; creneaux: Creneau[] }) {
  const resources = useMemo(() => {
    const vues = new Set<string>();
    const liste: { id: string; name: string }[] = [];
    creneaux.forEach((c) => {
      if (!vues.has(c.tache)) {
        vues.add(c.tache);
        liste.push({ id: c.tache, name: c.tache });
      }
    });
    return liste;
  }, [creneaux]);

  const events = useMemo(
    () => creneaux.map(creneauVersEvenement).filter((e): e is NonNullable<typeof e> => e !== null),
    [creneaux]
  );

  return (
    <div className="planning-jour rounded-2xl border border-ligne bg-sable-carte p-5">
      <h3 className="font-display mb-3 text-[15px] text-terracotta">{formatJour(date)}</h3>
      <DayPilotScheduler
        startDate={new DayPilot.Date(`${date}T00:00:00`)}
        days={1}
        scale="Hour"
        businessBeginsHour={7}
        businessEndsHour={22}
        locale="fr-fr"
        rowHeaderWidth={160}
        eventHeight={30}
        heightSpec="Auto"
        resources={resources}
        events={events}
      />
    </div>
  );
}

export function PlanningManifestation({ creneaux }: { creneaux: Creneau[] }) {
  const parJour = useMemo(() => {
    const map = new Map<string, Creneau[]>();
    creneaux.forEach((c) => {
      if (!map.has(c.date)) map.set(c.date, []);
      map.get(c.date)!.push(c);
    });
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [creneaux]);

  if (creneaux.length === 0) return null;

  const categoriesPresentes = CATEGORIES_CRENEAU.filter((cat) => creneaux.some((c) => c.categorie === cat));

  return (
    <div className="planning-impression flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl italic">Planning</h2>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-4 py-2 text-[13px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta print:hidden"
        >
          <Printer size={15} />
          Imprimer
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoriesPresentes.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-white"
            style={{ background: couleurCategorie(cat) }}
          >
            {cat}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {parJour.map(([date, creneauxJour]) => (
          <PlanningJour key={date} date={date} creneaux={creneauxJour} />
        ))}
      </div>
    </div>
  );
}
