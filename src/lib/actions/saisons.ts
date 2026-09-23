'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

/** Les deux divisions du championnat national FLBP. Le club joue en D2
 *  jusqu'en 2026, en D1 dès 2027 (migration 0069). */
export const DIVISIONS_NATIONALES = ['National D1', 'National D2'] as const;

function divisionValide(d: string): d is (typeof DIVISIONS_NATIONALES)[number] {
  return (DIVISIONS_NATIONALES as readonly string[]).includes(d);
}

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

export async function creerSaison(data: {
  libelle: string;
  dateDebut: string;
  dateFin: string;
  divisionNationale: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!data.libelle || !data.dateDebut || !data.dateFin) {
    return { ok: false, error: 'Libellé, date de début et date de fin obligatoires.' };
  }
  if (data.dateFin < data.dateDebut) {
    return { ok: false, error: 'La date de fin ne peut pas être avant la date de début.' };
  }
  // Pas de division par défaut : elle change d'une saison à l'autre, et un
  // libellé faux s'afficherait sur tout le module National.
  if (!divisionValide(data.divisionNationale)) {
    return { ok: false, error: 'Choisissez la division du club pour cette saison (National D1 ou D2).' };
  }

  const { data: inserted, error } = await supabase
    .from('saisons')
    .insert({
      libelle: data.libelle,
      date_debut: data.dateDebut,
      date_fin: data.dateFin,
      division_nationale: data.divisionNationale,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/saisons');
  return { ok: true, id: inserted.id };
}

/** Corrige la division d'une saison existante — la policy « modification
 *  CA » (0016) laisse le comité écrire directement sur `saisons`. */
export async function definirDivisionSaison(id: number, division: string): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!divisionValide(division)) return { ok: false, error: 'Division inconnue.' };
  const { error } = await supabase.from('saisons').update({ division_nationale: division }).eq('id', id);
  if (error) return { ok: false, error: error.message };
  revalidatePath('/saisons');
  return { ok: true };
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
