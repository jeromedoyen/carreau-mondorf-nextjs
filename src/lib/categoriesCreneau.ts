/** Catégories réelles des créneaux (CATEGORIES_CRENEAU, carreau-mondorf-app/
 *  Code.gs) — confirmées dans les données importées (26/07/2026). Palette
 *  dédiée à ce module : la charte v2 (terracotta/pin/laiton/marine) n'a que
 *  6 teintes distinctes, insuffisant pour 8 catégories sans ambiguïté —
 *  extension délibérée, tons assortis (chaud/discret, pas de néon), pour
 *  le planning visuel (PlanningManifestation.tsx) et sa légende. */
export const CATEGORIES_CRENEAU = [
  'Cuisine',
  'Bar',
  'Table de marque',
  'Service',
  'Vaisselle',
  'Barbecue',
  'Préparation',
  'Temps fort',
  'Autre',
] as const;

export const COULEUR_CATEGORIE: Record<string, string> = {
  Cuisine: '#c98a3e',
  Bar: '#1c3a56',
  'Table de marque': '#24463a',
  Service: '#6b5b95',
  Vaisselle: '#2f8f83',
  Barbecue: '#96401f',
  Préparation: '#8b8577',
  'Temps fort': '#b1852f',
  Autre: '#5a4c3c',
};

export function couleurCategorie(categorie: string): string {
  return COULEUR_CATEGORIE[categorie] ?? COULEUR_CATEGORIE.Autre;
}
