import type { SupabaseClient } from '@supabase/supabase-js';

export type TypeConcours =
  | 'CHAMPIONNAT_D2'
  | 'CHAMPIONNAT_PROMOTION'
  | 'CHAMPIONNAT_NATIONAL'
  | 'TOURNOI_CALENDRIER'
  | 'TOURNOI_HORS_CALENDRIER';

export type FormatConcours = 'TETE_A_TETE' | 'DOUBLETTE' | 'TRIPLETTE';

export type StatutRemboursement = 'non_calcule' | 'a_valider' | 'valide_tresorier' | 'paye';

export type ConcoursExterieur = {
  id: number;
  date: string;
  lieu: string;
  typeConcours: TypeConcours;
  format: FormatConcours;
  pays: string;
  estCalendrier: boolean;
  chefEquipeId: number | null;
};

export type ParticipationExterieure = {
  id: number;
  concoursId: number;
  joueurId: number;
  joueurNom: string;
  concours: ConcoursExterieur;
  statutParticipation: 'prevu' | 'confirme' | 'annule' | 'joue';
  montantCalcule: number | null;
  montantManuel: number | null;
  montantFinal: number | null;
  statutRemboursement: StatutRemboursement;
  datePaiement: string | null;
  modePaiement: string | null;
};

/** Phase 1 (fondations) du module remboursement concours extérieurs —
 *  cf. supabase/migrations/0045_remboursement_concours_exterieurs.sql.
 *  Vue trésorier/CA uniquement pour l'instant (RLS CA-only en écriture) ;
 *  la délégation aux chefs d'équipe est une phase ultérieure. */
export async function getParticipationsExterieures(supabase: SupabaseClient): Promise<ParticipationExterieure[]> {
  const { data, error } = await supabase
    .from('participations_exterieures')
    .select(
      'id, concours_id, joueur_id, statut_participation, montant_calcule, montant_manuel, montant_final, statut_remboursement, date_paiement, mode_paiement, personnes(prenom, nom), concours_exterieurs(id, date, lieu, type_concours, format, pays, est_calendrier, chef_equipe_id)'
    )
    .eq('supprime', false)
    .order('date_concours', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((p) => {
    const personne = p.personnes as unknown as { prenom: string; nom: string } | null;
    const c = p.concours_exterieurs as unknown as {
      id: number;
      date: string;
      lieu: string;
      type_concours: TypeConcours;
      format: FormatConcours;
      pays: string;
      est_calendrier: boolean;
      chef_equipe_id: number | null;
    };
    return {
      id: p.id,
      concoursId: p.concours_id,
      joueurId: p.joueur_id,
      joueurNom: personne ? `${personne.prenom} ${personne.nom}` : '—',
      concours: {
        id: c.id,
        date: c.date,
        lieu: c.lieu,
        typeConcours: c.type_concours,
        format: c.format,
        pays: c.pays,
        estCalendrier: c.est_calendrier,
        chefEquipeId: c.chef_equipe_id,
      },
      statutParticipation: p.statut_participation,
      montantCalcule: p.montant_calcule,
      montantManuel: p.montant_manuel,
      montantFinal: p.montant_final,
      statutRemboursement: p.statut_remboursement,
      datePaiement: p.date_paiement,
      modePaiement: p.mode_paiement,
    };
  });
}

export type BaremeIndemnite = {
  id: number;
  typeConcours: TypeConcours;
  format: FormatConcours;
  pays: string;
  montantBase: number;
  ratioRepas: number | null;
  anneeSportive: string;
  actif: boolean;
};

export async function getBaremesIndemnites(supabase: SupabaseClient): Promise<BaremeIndemnite[]> {
  const { data, error } = await supabase
    .from('baremes_indemnites')
    .select('id, type_concours, format, pays, montant_base, ratio_repas, annee_sportive, actif')
    .order('annee_sportive', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((b) => ({
    id: b.id,
    typeConcours: b.type_concours,
    format: b.format,
    pays: b.pays,
    montantBase: b.montant_base,
    ratioRepas: b.ratio_repas,
    anneeSportive: b.annee_sportive,
    actif: b.actif,
  }));
}

/** Licenciés du club, pour le sélecteur de joueur du formulaire de
 *  participation — même filtre (type='Licencié', supprime=false) que
 *  matchSheet.ts. */
export async function getLicenciesPourSelecteur(
  supabase: SupabaseClient
): Promise<{ id: number; nom: string }[]> {
  const { data, error } = await supabase
    .from('adhesions')
    .select('personnes(id, prenom, nom)')
    .eq('type', 'Licencié')
    .eq('supprime', false);
  if (error) throw error;
  return (data ?? [])
    .map((a) => a.personnes as unknown as { id: number; prenom: string; nom: string } | null)
    .filter((p): p is { id: number; prenom: string; nom: string } => !!p)
    .map((p) => ({ id: p.id, nom: `${p.prenom} ${p.nom}` }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

export async function getConcoursExterieurs(supabase: SupabaseClient): Promise<ConcoursExterieur[]> {
  const { data, error } = await supabase
    .from('concours_exterieurs')
    .select('id, date, lieu, type_concours, format, pays, est_calendrier, chef_equipe_id')
    .eq('supprime', false)
    .order('date', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    date: c.date,
    lieu: c.lieu,
    typeConcours: c.type_concours,
    format: c.format,
    pays: c.pays,
    estCalendrier: c.est_calendrier,
    chefEquipeId: c.chef_equipe_id,
  }));
}
