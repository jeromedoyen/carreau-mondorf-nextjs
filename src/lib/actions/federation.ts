'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

export type EvenementFederationSaisi = {
  libelle: string;
  date: string;
  dateFin?: string;
  categorie: string;
  lieu?: string;
  domicile?: string;
  concerneClub?: boolean;
  notes?: string;
};

export async function creerEvenementFederation(data: EvenementFederationSaisi): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!data.libelle || !data.date) return { ok: false, error: 'Libellé et date obligatoires.' };

  const saison = data.date.slice(0, 4);
  const { data: inserted, error } = await supabase
    .from('calendrier_federation')
    .insert({
      saison,
      date: data.date,
      date_fin: data.dateFin || data.date,
      libelle: data.libelle,
      categorie: data.categorie || null,
      lieu: data.lieu || null,
      domicile: data.domicile === 'Oui' ? true : data.domicile === 'Non' ? false : null,
      concerne_club: !!data.concerneClub,
      notes: data.notes || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/federation');
  revalidatePath('/calendrier');
  return { ok: true, id: inserted.id };
}

export async function supprimerEvenementFederation(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { error } = await supabase.from('calendrier_federation').update({ supprime: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/federation');
  revalidatePath('/calendrier');
  return { ok: true };
}
