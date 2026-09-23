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
  /** Points de classement au barème FLBP : 2 par victoire, 1 par défaite. */
  points: number;
};

export type ClassementFinalEntry = {
  club: string;
  joues: number;
  victoires: number;
  defaites: number;
  ptsFaits: number;
  ptsRendus: number;
  diff: number;
  /** Points de classement au barème FLBP : 2 par victoire, 1 par défaite. */
  points: number;
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
  /** Points marqués sur cette partie (règlement FLBP : Triplette 5, Doublette
   *  3, Tête à tête 2 — 3 en phase 3 — uniquement en cas de victoire, 0 sinon).
   *  Voir pointsVictoirePartie() dans lib/stats.ts. */
  points: number;
};

/** Points cumulés d'un joueur pour une journée donnée (une des deux
 *  rencontres de championnat par journée). */
export type PointsJourneeD2 = {
  journee: number;
  points: number;
};

export type StatJoueurD2 = {
  nom: string;
  parType: StatsParType;
  parties: PartieJoueurD2[];
  joues: number;
  victoires: number;
  tauxVictoire: number;
  pointsTotal: number;
  pointsParJournee: PointsJourneeD2[];
};

export type StatEquipeD2 = {
  type: string;
  joueurs: string[];
  joues: number;
  victoires: number;
  tauxVictoire: number;
};

/** Contexte collectif d'une partie — le résultat de la rencontre dans
 *  laquelle elle s'est jouée, et le camp. Disponible uniquement via la RPC
 *  `mes_parties_d2()` (migration 0062), donc absent de la vue collective
 *  `/national-d2` qui lit `parties_d2` sans jointure sur la rencontre. */
export type ContexteRencontreD2 = {
  domicile: boolean | null;
  scoreRencontreCM: number | null;
  scoreRencontreAdverse: number | null;
  /** Rang de la partie dans sa phase, tel que numéroté sur la feuille de
   *  match — permet de réordonner les parties d'une journée comme elles
   *  ont été jouées. */
  ordre: number | null;
};

export type PartieJoueurD2Enrichie = PartieJoueurD2 & ContexteRencontreD2;

export type StatistiquesD2 = {
  joueurs: StatJoueurD2[];
  equipes: StatEquipeD2[];
  /** Mêmes joueurs que `joueurs`, triés par points marqués (règlement FLBP)
   *  décroissants — classement demandé en plus du taux de victoire. */
  classementPoints: StatJoueurD2[];
};

// Statistiques individuelles Promotion — pas de détail par partie disponible
// (seul le bilan du trio par journée a été importé), donc pas de "parType"
// ni d'historique de parties par joueur, contrairement au National D2.

/** Une partie d'un trio de Carreau Mondorf, telle que lue sur la feuille de
 *  journée de la FLBP (`promotion_parties`, migration 0068). Le trio joue
 *  ensemble : la partie est portée à chacun de ses membres. */
export type PartieJoueurPromotion = {
  journee: number;
  date: string;
  numeroEquipe: number;
  /** Rang de la partie dans la journée, 1 à 4. */
  numero: number;
  exempt: boolean;
  adversaireClub: string | null;
  adversaireNumeroEquipe: number | null;
  scoreCM: number;
  /** Nul quand le trio était exempt : il n'y a pas eu d'adversaire. */
  scoreAdverse: number | null;
  gagnee: boolean;
  partenaires: string[];
};

export type PointsJourneePromotion = {
  journee: number;
  /** 5 points par partie gagnée du trio ce jour-là. */
  points: number;
};

export type StatJoueurPromotion = {
  nom: string;
  participations: number;
  partiesJouees: number;
  partiesGagnees: number;
  tauxVictoire: number;
  /** partiesGagnees × 5 — le barème de la Promotion, crédité à chaque
   *  membre du trio. */
  pointsTotal: number;
  pointsParJournee: PointsJourneePromotion[];
  /** Détail partie par partie. Vide pour une saison dont les feuilles de
   *  journée n'ont pas été importées (2025) : le bilan du trio existe alors
   *  sans son détail. */
  parties: PartieJoueurPromotion[];
  partenaires: { nom: string; journees: number }[];
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
  /** Vrai dès qu'au moins une partie détaillée existe pour la saison. */
  detailDisponible: boolean;
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
  notes: string | null;
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
