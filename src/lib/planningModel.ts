import type { Creneau } from './manifestations';

/** Modèle partagé entre l'affichage écran (PlanningManifestation.tsx) et le
 *  PDF (PlanningPdf.tsx) — construit une seule fois à partir des créneaux,
 *  consommé par les deux rendus pour ne jamais les faire diverger.
 *  Colonnes horaires 7h→22h, comme le planning de référence
 *  (Planning_benevoles_Concours_Vitali-Brunetta.pdf). */
export const HEURE_DEBUT = 7;
export const HEURE_FIN = 22;
export const HEURES = Array.from({ length: HEURE_FIN - HEURE_DEBUT + 1 }, (_, i) => HEURE_DEBUT + i);

export type SegmentTache = {
  /** Position en heures décimales depuis HEURE_DEBUT (peut être fractionnaire, ex. 12.75 = 12h45). */
  debut: number;
  fin: number;
  /** Marqueur ponctuel (ex. "Remise des prix 17h") plutôt qu'une plage — rendu en losange, pas en barre. */
  point: boolean;
  imprecise: boolean;
};

export type LigneTache = {
  id: number;
  tache: string;
  categorie: string;
  horaireLabel: string;
  personnes: string;
  segment: SegmentTache | null;
};

export type JourPlanning = {
  date: string;
  label: string;
  lignes: LigneTache[];
};

function heureVersDecimal(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h + m / 60;
}

function formatHeureLabel(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, '0')}`;
}

function construireLigne(c: Creneau): LigneTache {
  const personnes = c.affectations.map((a) => a.nom).join(', ') || (c.postesPrevus > 0 ? '—' : '');

  if (!c.heureDebut) {
    return { id: c.id, tache: c.tache, categorie: c.categorie, horaireLabel: 'Horaire à définir', personnes, segment: null };
  }

  const debut = heureVersDecimal(c.heureDebut);

  if (!c.heureFin && !c.finImprecise) {
    // Repère ponctuel (ex. "Remise des prix 17h") — pas de plage, pas de bénévoles à afficher.
    return {
      id: c.id,
      tache: c.tache,
      categorie: c.categorie,
      horaireLabel: formatHeureLabel(c.heureDebut),
      personnes,
      segment: { debut: debut - HEURE_DEBUT, fin: debut - HEURE_DEBUT + 0.25, point: true, imprecise: false },
    };
  }

  if (c.finImprecise) {
    return {
      id: c.id,
      tache: c.tache,
      categorie: c.categorie,
      horaireLabel: `${formatHeureLabel(c.heureDebut)} → (fin à préciser)`,
      personnes,
      segment: { debut: debut - HEURE_DEBUT, fin: Math.min(debut - HEURE_DEBUT + 2, HEURE_FIN - HEURE_DEBUT), point: false, imprecise: true },
    };
  }

  const fin = heureVersDecimal(c.heureFin!);
  return {
    id: c.id,
    tache: c.tache,
    categorie: c.categorie,
    horaireLabel: `${formatHeureLabel(c.heureDebut)} – ${formatHeureLabel(c.heureFin!)}`,
    personnes,
    segment: { debut: debut - HEURE_DEBUT, fin: fin - HEURE_DEBUT, point: false, imprecise: false },
  };
}

export function construirePlanning(creneaux: Creneau[]): JourPlanning[] {
  const parJour = new Map<string, Creneau[]>();
  creneaux.forEach((c) => {
    if (!parJour.has(c.date)) parJour.set(c.date, []);
    parJour.get(c.date)!.push(c);
  });

  return Array.from(parJour.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, creneauxJour]) => {
      const d = new Date(date + 'T00:00:00');
      const label = d
        .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
        .toUpperCase();
      return { date, label, lignes: creneauxJour.map(construireLigne) };
    });
}
