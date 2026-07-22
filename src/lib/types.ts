// Formes de données du module Compétition — mêmes champs que renvoyait
// getClassementDivisionD2() côté Apps Script (DivisionD2Backend.gs).

export type EvolutionPoint = {
  journee: number;
  rang: number;
  joues: number;
  victoires: number;
  defaites: number;
  ptsFaits: number;
  ptsRendus: number;
  diff: number;
};

export type ClassementFinalEntry = {
  club: string;
  joues: number;
  victoires: number;
  defaites: number;
  ptsFaits: number;
  ptsRendus: number;
  diff: number;
  rang: number;
};

export type ClassementDivisionD2 = {
  saison: string;
  journees: number[];
  clubs: string[];
  evolution: Record<string, EvolutionPoint[]>;
  classementFinal: ClassementFinalEntry[];
};

export const CLUB_CARREAU_MONDORF = 'Carreau Mondorf';
