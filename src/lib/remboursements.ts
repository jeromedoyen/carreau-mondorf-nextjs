import type { SupabaseClient } from '@supabase/supabase-js';

export type TypeParticipationConcours = 'Championnat_D2' | 'Promotion' | 'Concours_National' | 'Concours';
export type StatutParticipationConcours = 'en_attente' | 'valide' | 'paye';

export type ParticipationConcours = {
  id: number;
  saison: string;
  type: TypeParticipationConcours;
  source: 'auto' | 'manuel';
  personneId: number;
  personneNom: string;
  chefEquipeId: number | null;
  chefEquipeNom: string | null;
  date: string;
  club: string | null;
  pays: string;
  horsCalendrier: boolean;
  horsPays: boolean;
  inscriptionMontant: number | null;
  repasInclus: boolean;
  montantFinal: number | null;
  statut: StatutParticipationConcours;
  payeLe: string | null;
  notes: string | null;
};

type LigneParticipation = {
  id: number;
  saison: string;
  type: TypeParticipationConcours;
  source: 'auto' | 'manuel';
  personne_id: number;
  personnes: { nom: string; prenom: string } | { nom: string; prenom: string }[] | null;
  chef_equipe_id: number | null;
  date: string;
  club: string | null;
  pays: string;
  hors_calendrier: boolean;
  hors_pays: boolean;
  inscription_montant: number | null;
  repas_inclus: boolean;
  montant_final: number | null;
  statut: StatutParticipationConcours;
  paye_le: string | null;
  notes: string | null;
};

function nomPersonne(p: LigneParticipation['personnes']): string {
  const l = Array.isArray(p) ? p[0] : p;
  return l ? `${l.prenom} ${l.nom}` : '—';
}

/** Toutes les participations d'une saison, avec le nom du joueur et du
 *  chef d'équipe résolus (jointure `personnes`). RLS : trésorerie voit
 *  tout, un licencié ne voit que les siennes (donc cette fonction, appelée
 *  avec le client CA/trésorerie, renvoie l'ensemble ; appelée avec le
 *  client d'un licencié normal, ne renverra que ses lignes — comportement
 *  voulu, pas un bug). */
export async function getParticipationsConcours(
  supabase: SupabaseClient,
  saison: string
): Promise<ParticipationConcours[]> {
  const { data, error } = await supabase
    .from('participations_concours')
    .select(
      'id, saison, type, source, personne_id, personnes!participations_concours_personne_id_fkey(nom, prenom), chef_equipe_id, date, club, pays, hors_calendrier, hors_pays, inscription_montant, repas_inclus, montant_final, statut, paye_le, notes'
    )
    .eq('saison', saison)
    .eq('supprime', false)
    .order('date', { ascending: false });
  if (error) throw error;

  const lignes = (data ?? []) as unknown as LigneParticipation[];
  const nomParPersonneId = new Map(lignes.map((l) => [l.personne_id, nomPersonne(l.personnes)]));

  return lignes.map((l) => ({
    id: l.id,
    saison: l.saison,
    type: l.type,
    source: l.source,
    personneId: l.personne_id,
    personneNom: nomPersonne(l.personnes),
    chefEquipeId: l.chef_equipe_id,
    chefEquipeNom: l.chef_equipe_id ? (nomParPersonneId.get(l.chef_equipe_id) ?? null) : null,
    date: l.date,
    club: l.club,
    pays: l.pays,
    horsCalendrier: l.hors_calendrier,
    horsPays: l.hors_pays,
    inscriptionMontant: l.inscription_montant,
    repasInclus: l.repas_inclus,
    montantFinal: l.montant_final,
    statut: l.statut,
    payeLe: l.paye_le,
    notes: l.notes,
  }));
}

export async function getMontantRemboursementConcours(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.from('parametres_club').select('montant_remboursement_concours').eq('id', 1).maybeSingle();
  return data?.montant_remboursement_concours ?? 10;
}
