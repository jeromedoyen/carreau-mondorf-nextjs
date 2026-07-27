import { createClient } from './supabase/server';

export type ClassementBenevole = {
  nom: string;
  estMembre: boolean;
  participations: number;
  manifestations: number;
  heures: number;
  tacheFrequente: string;
  derniereParticipation: string;
};

export type StatistiqueCategorie = { categorie: string; participations: number; heures: number };
export type StatistiqueManifestation = { manifestation: string; participations: number; benevoles: number };

export type StatistiquesBenevoles = {
  classement: ClassementBenevole[];
  parCategorie: StatistiqueCategorie[];
  parManifestation: StatistiqueManifestation[];
  totalMembres: number;
  totalExternes: number;
};

function heureVersDecimal(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  if (Number.isNaN(h)) return null;
  return h + (Number.isNaN(m) ? 0 : m / 60);
}

type Agrege = {
  nom: string;
  estMembre: boolean;
  participations: number;
  manifestations: Set<number>;
  heures: number;
  taches: Map<string, number>;
  derniereParticipation: string;
};

/** Port de getStatistiquesBenevoles()/getStatistiquesGlobales() (v1,
 *  Code.gs) — même agrégation (classement par participations, ventilation
 *  par catégorie de tâche et par manifestation), toutes saisons confondues
 *  comme la version d'origine (pas de filtre par année : le classement a du
 *  sens sur la durée, pas seulement l'année en cours). CA uniquement — page
 *  appelante gardée par estMembreCA(), même si la RLS sous-jacente autorise
 *  déjà tout licencié à lire ces tables (0009_manifestations.sql) : ce
 *  classement nominatif est un outil de pilotage du comité, pas une donnée
 *  à exposer publiquement. */
export async function getStatistiquesBenevoles(): Promise<StatistiquesBenevoles> {
  const supabase = await createClient();

  const { data: manifestations, error: errM } = await supabase
    .from('manifestations')
    .select('id, nom')
    .eq('supprime', false);
  if (errM) throw errM;
  const manifById = new Map((manifestations ?? []).map((m) => [m.id, m]));

  const { data: creneaux, error: errC } = await supabase
    .from('creneaux')
    .select('id, manifestation_id, categorie, date, heure_debut, heure_fin')
    .eq('supprime', false);
  if (errC) throw errC;
  const creneauById = new Map((creneaux ?? []).map((c) => [c.id, c]));

  const { data: affectations, error: errA } = await supabase
    .from('affectations')
    .select('creneau_id, nom, est_membre')
    .eq('supprime', false);
  if (errA) throw errA;

  const parPersonne = new Map<string, Agrege>();
  const parCategorie = new Map<string, StatistiqueCategorie>();
  const parManifestation = new Map<number, { manifestation: string; participations: number; benevoles: Set<string> }>();
  const vus = new Set<string>();
  let totalMembres = 0;
  let totalExternes = 0;

  for (const a of affectations ?? []) {
    const c = creneauById.get(a.creneau_id);
    if (!c) continue;
    const m = manifById.get(c.manifestation_id);
    if (!m) continue;

    let p = parPersonne.get(a.nom);
    if (!p) {
      p = { nom: a.nom, estMembre: a.est_membre, participations: 0, manifestations: new Set(), heures: 0, taches: new Map(), derniereParticipation: '' };
      parPersonne.set(a.nom, p);
    }
    p.participations++;
    p.manifestations.add(m.id);
    const cat = c.categorie || 'Autre';
    p.taches.set(cat, (p.taches.get(cat) ?? 0) + 1);
    const debut = heureVersDecimal(c.heure_debut);
    const fin = heureVersDecimal(c.heure_fin);
    const duree = debut !== null && fin !== null && fin > debut ? fin - debut : 0;
    p.heures += duree;
    if (c.date && c.date > p.derniereParticipation) p.derniereParticipation = c.date;

    let statCat = parCategorie.get(cat);
    if (!statCat) {
      statCat = { categorie: cat, participations: 0, heures: 0 };
      parCategorie.set(cat, statCat);
    }
    statCat.participations++;
    statCat.heures += duree;

    let statManif = parManifestation.get(m.id);
    if (!statManif) {
      statManif = { manifestation: m.nom, participations: 0, benevoles: new Set() };
      parManifestation.set(m.id, statManif);
    }
    statManif.participations++;
    statManif.benevoles.add(a.nom);

    if (!vus.has(a.nom)) {
      vus.add(a.nom);
      if (a.est_membre) totalMembres++;
      else totalExternes++;
    }
  }

  const classement: ClassementBenevole[] = Array.from(parPersonne.values())
    .map((p) => {
      const tacheFrequente = Array.from(p.taches.entries()).sort((x, y) => y[1] - x[1])[0]?.[0] ?? '';
      return {
        nom: p.nom,
        estMembre: p.estMembre,
        participations: p.participations,
        manifestations: p.manifestations.size,
        heures: Math.round(p.heures * 10) / 10,
        tacheFrequente,
        derniereParticipation: p.derniereParticipation,
      };
    })
    .sort((a, b) => b.participations - a.participations);

  const parCategorieListe = Array.from(parCategorie.values())
    .map((c) => ({ ...c, heures: Math.round(c.heures * 10) / 10 }))
    .sort((a, b) => b.participations - a.participations);

  const parManifestationListe = Array.from(parManifestation.values())
    .map((m) => ({ manifestation: m.manifestation, participations: m.participations, benevoles: m.benevoles.size }))
    .sort((a, b) => b.participations - a.participations);

  return { classement, parCategorie: parCategorieListe, parManifestation: parManifestationListe, totalMembres, totalExternes };
}
