'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { MEMBRES_CA } from '@/lib/membresCA';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

/** Port fidèle de createConge() (carreau-mondorf-app/Code.gs:1862) : même
 *  validation (personne connue du CA, date fin >= date début). */
export async function creerConge(data: {
  personne: string;
  dateDebut: string;
  dateFin: string;
  motif?: string;
  note?: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  if (!MEMBRES_CA.some((m) => m.nom === data.personne)) {
    return { ok: false, error: 'Personne invalide — doit être un membre du CA connu.' };
  }
  if (!data.dateDebut) return { ok: false, error: 'Date de début obligatoire.' };
  const dateFin = data.dateFin || data.dateDebut;
  if (dateFin < data.dateDebut) {
    return { ok: false, error: 'La date de fin ne peut pas être avant la date de début.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const saison = data.dateDebut.slice(0, 4);
  const { data: inserted, error } = await supabase
    .from('conges')
    .insert({
      saison,
      personne: data.personne,
      date_debut: data.dateDebut,
      date_fin: dateFin,
      motif: data.motif || null,
      note: data.note || null,
      cree_par: user?.email || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/conges');
  return { ok: true, id: inserted.id };
}

export async function supprimerConge(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { error } = await supabase.from('conges').update({ supprime: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/conges');
  return { ok: true };
}
