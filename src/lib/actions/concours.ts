'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { FormatConcours, TypeConcours } from '@/lib/concours';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

/** Phase 1 (fondations) du module remboursement concours extérieurs —
 *  écriture réservée au CA pour l'instant (délégation aux chefs d'équipe :
 *  phase ultérieure, cf. lib/concours.ts). */
export async function creerConcoursExterieur(data: {
  date: string;
  lieu: string;
  typeConcours: TypeConcours;
  format: FormatConcours;
  pays?: string;
  estCalendrier: boolean;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.date || !data.lieu.trim()) return { ok: false, error: 'Date et lieu obligatoires.' };

  const { data: inserted, error } = await supabase
    .from('concours_exterieurs')
    .insert({
      date: data.date,
      lieu: data.lieu.trim(),
      type_concours: data.typeConcours,
      format: data.format,
      pays: data.pays || 'LU',
      est_calendrier: data.estCalendrier,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true, id: inserted.id };
}

export async function enregistrerBaremeIndemnite(data: {
  typeConcours: TypeConcours;
  format: FormatConcours;
  pays: string;
  montantBase: number;
  ratioRepas?: number;
  anneeSportive: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!(data.montantBase >= 0)) return { ok: false, error: 'Montant de base invalide.' };

  const { error } = await supabase.from('baremes_indemnites').upsert(
    {
      type_concours: data.typeConcours,
      format: data.format,
      pays: data.pays || 'LU',
      montant_base: data.montantBase,
      ratio_repas: data.ratioRepas ?? null,
      annee_sportive: data.anneeSportive,
      actif: true,
    },
    { onConflict: 'type_concours,format,pays,annee_sportive' }
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true };
}

export async function enregistrerParticipation(data: {
  concoursId: number;
  joueurId: number;
  statutParticipation: 'prevu' | 'confirme' | 'annule' | 'joue';
  montantManuel?: number;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('participations_exterieures').insert({
    concours_id: data.concoursId,
    joueur_id: data.joueurId,
    statut_participation: data.statutParticipation,
    montant_manuel: data.montantManuel ?? null,
  });
  if (error) {
    // Contrainte anti-doublon (participations_anti_doublon_idx) : message
    // clair plutôt que le code d'erreur Postgres brut.
    if (error.code === '23505') {
      return { ok: false, error: 'Ce joueur a déjà une participation "jouée" enregistrée pour cette date.' };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath('/outils/remboursements');
  return { ok: true };
}

/** a_valider -> valide_tresorier (le comité sportif/CA confirme le
 *  montant avant paiement). */
export async function validerParticipation(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase
    .from('participations_exterieures')
    .update({ statut_remboursement: 'valide_tresorier' })
    .eq('id', id)
    .eq('statut_remboursement', 'a_valider');
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true };
}

/** valide_tresorier -> paye. Verrouillé ensuite par trigger DB
 *  (verrouiller_participation_payee) contre toute modification silencieuse
 *  du montant une fois payé. */
export async function marquerParticipationPayee(id: number, modePaiement: string): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!modePaiement.trim()) return { ok: false, error: 'Mode de paiement obligatoire.' };

  const { error } = await supabase
    .from('participations_exterieures')
    .update({
      statut_remboursement: 'paye',
      date_paiement: new Date().toISOString().slice(0, 10),
      mode_paiement: modePaiement.trim(),
    })
    .eq('id', id)
    .eq('statut_remboursement', 'valide_tresorier');
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/remboursements');
  return { ok: true };
}
