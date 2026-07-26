'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

export async function creerSaison(data: { libelle: string; dateDebut: string; dateFin: string }): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!data.libelle || !data.dateDebut || !data.dateFin) {
    return { ok: false, error: 'Libellé, date de début et date de fin obligatoires.' };
  }
  if (data.dateFin < data.dateDebut) {
    return { ok: false, error: 'La date de fin ne peut pas être avant la date de début.' };
  }

  const { data: inserted, error } = await supabase
    .from('saisons')
    .insert({ libelle: data.libelle, date_debut: data.dateDebut, date_fin: data.dateFin })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/saisons');
  return { ok: true, id: inserted.id };
}

/** Bascule la saison active — port de la fonction Postgres activer_saison()
 *  (0016_ecriture_saisons.sql), qui gère l'atomicité désactive-ancienne/
 *  active-nouvelle en une seule transaction. */
export async function activerSaison(id: number): Promise<Resultat> {
  const supabase = await createClient();
  const { error } = await supabase.rpc('activer_saison', { p_id: id });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/saisons');
  return { ok: true };
}
