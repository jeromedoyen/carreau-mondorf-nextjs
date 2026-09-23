import type { SupabaseClient } from '@supabase/supabase-js';
import { getClassementDivisionD2, getClassementPromotion } from './data';
import { CLUB_CARREAU_MONDORF } from './types';

/** La place de Carreau Mondorf dans un championnat, pour le tableau de bord
 *  du licencié (`/moncaro`) et sa vue comité — demande de Jérôme du
 *  23/09/2026, « ajoute le rang du club ».
 *
 *  Deux championnats, deux sources, une même forme à l'écran :
 *
 *    National   `division_d2_resultats`, classement recalculé au barème
 *               officiel (2 par victoire, 1 par défaite), à la dernière
 *               journée connue ;
 *    Promotion  `promotion_classement`, le dernier classement **publié**
 *               par la FLBP — jamais recalculé, voir migration 0066.
 *
 *  `precision` dit d'où sort le rang (« classement final », « après la
 *  journée 12 ») : un rang sans sa date se lirait comme définitif. */
export type RangClub = {
  rang: number;
  nbClubs: number;
  points: number;
  precision: string;
};

export async function getRangClubNational(saison: string): Promise<RangClub | null> {
  const classement = await getClassementDivisionD2(saison);
  const entree = classement.classementFinal.find((e) => e.club === CLUB_CARREAU_MONDORF);
  if (!entree || !classement.journees.length) return null;
  const derniere = classement.journees[classement.journees.length - 1];
  return {
    rang: entree.rang,
    nbClubs: classement.classementFinal.length,
    points: entree.points,
    precision: `après la journée ${derniere}`,
  };
}

export async function getRangClubPromotion(
  supabase: SupabaseClient,
  saison: string
): Promise<RangClub | null> {
  const { classements, resultats } = await getClassementPromotion(supabase, saison);
  const dernier = classements[classements.length - 1];
  if (!dernier) return null;
  const ligne = dernier.lignes.find((l) => l.club === CLUB_CARREAU_MONDORF);
  if (!ligne) return null;
  const derniereJournee = resultats.reduce((max, r) => Math.max(max, r.journee), 0);
  const estFinal = dernier.apresJournee >= derniereJournee;
  return {
    rang: ligne.position,
    nbClubs: dernier.lignes.length,
    points: ligne.points,
    precision: estFinal ? 'classement final' : `après la journée ${dernier.apresJournee}`,
  };
}
