import { createClient } from './supabase/server';

export type Conge = {
  id: number;
  saison: string;
  personne: string;
  dateDebut: string;
  dateFin: string;
  motif: string | null;
  note: string | null;
};

export async function getConges(saison: string): Promise<Conge[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('conges')
    .select('id, saison, personne, date_debut, date_fin, motif, note')
    .eq('saison', saison)
    .eq('supprime', false)
    .order('date_debut', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((c) => ({
    id: c.id,
    saison: c.saison,
    personne: c.personne,
    dateDebut: c.date_debut,
    dateFin: c.date_fin,
    motif: c.motif,
    note: c.note,
  }));
}
