'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

export async function enregistrerParametresClub(data: {
  nomBeneficiaire: string;
  iban: string;
  bic?: string;
  ville?: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.nomBeneficiaire.trim() || !data.iban.trim()) {
    return { ok: false, error: 'Bénéficiaire et IBAN obligatoires.' };
  }

  const { error } = await supabase.from('parametres_club').upsert({
    id: 1,
    nom_beneficiaire: data.nomBeneficiaire.trim(),
    iban: data.iban.trim(),
    bic: data.bic?.trim() || null,
    ville: data.ville?.trim() || null,
    maj_le: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true };
}

export async function creerAppelPaiement(data: {
  personneId?: number;
  type: 'Cotisation' | 'Licence' | 'Autre';
  montant: number;
  description: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.description.trim() || !(data.montant > 0)) {
    return { ok: false, error: 'Description et montant (positif) obligatoires.' };
  }

  const { data: inserted, error } = await supabase
    .from('appels_paiement')
    .insert({
      personne_id: data.personneId ?? null,
      type: data.type,
      montant: data.montant,
      description: data.description.trim(),
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true, id: inserted.id };
}

export async function marquerAppelPaye(id: number, modePaiement: string): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase
    .from('appels_paiement')
    .update({ statut: 'payee', mode_paiement: modePaiement || null, payee_le: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true };
}

export async function annulerAppelPaiement(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('appels_paiement').update({ statut: 'annulee' }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true };
}

export async function supprimerAppelPaiement(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('appels_paiement').update({ supprime: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true };
}
