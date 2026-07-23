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

// Statistiques individuelles National D2 — mêmes champs que renvoyait
// calculerStatistiquesJoueurs_() côté Apps Script (ChampionnatBackend.gs).

export type StatsParType = Record<string, { joues: number; victoires: number }>;

export type PartieJoueurD2 = {
  idRencontre: number;
  journee: number;
  date: string;
  adversaireClub: string | null;
  phase: number;
  type: string;
  scoreCM: number;
  scoreAdverse: number;
  gagne: boolean;
  partenaires: string[];
};

export type StatJoueurD2 = {
  nom: string;
  parType: StatsParType;
  parties: PartieJoueurD2[];
  joues: number;
  victoires: number;
  tauxVictoire: number;
};

export type StatEquipeD2 = {
  type: string;
  joueurs: string[];
  joues: number;
  victoires: number;
  tauxVictoire: number;
};

export type StatistiquesD2 = {
  joueurs: StatJoueurD2[];
  equipes: StatEquipeD2[];
};

// Statistiques individuelles Promotion — pas de détail par partie disponible
// (seul le bilan du trio par journée a été importé), donc pas de "parType"
// ni d'historique de parties par joueur, contrairement au National D2.

export type StatJoueurPromotion = {
  nom: string;
  participations: number;
  partiesJouees: number;
  partiesGagnees: number;
  tauxVictoire: number;
};

export type StatTrioPromotion = {
  joueurs: string[];
  participations: number;
  partiesJouees: number;
  partiesGagnees: number;
  tauxVictoire: number;
};

export type StatistiquesPromotion = {
  joueurs: StatJoueurPromotion[];
  trios: StatTrioPromotion[];
};

// Registre membres/licenciés (Phase 4) — réservé au CA, lu via le client
// Supabase avec session (src/lib/supabase/server.ts), pas le client public.

export type Personne = {
  id: number;
  nom: string;
  prenom: string;
  sexe: string | null;
  dateNaissance: string | null;
  nationalite: string | null;
  adresse: string | null;
  codePostalVille: string | null;
  telephone: string | null;
  email: string | null;
  droitImage: boolean | null;
};

export type Adhesion = {
  id: number;
  personneId: number;
  annee: string;
  type: string;
  licence: string | null;
  categorie: string | null;
  classe: string | null;
  cotisationPayee: boolean | null;
  licencePayee: boolean | null;
};

export type PersonneAvecAdhesion = Personne & { adhesion: Adhesion | null };
