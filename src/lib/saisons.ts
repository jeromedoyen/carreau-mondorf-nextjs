import { supabase } from '@/lib/supabase';

export type Saison = {
  libelle: string;
  dateDebut: string;
  dateFin: string;
  active: boolean;
};

/** Source de vérité transversale pour la liste des saisons et la saison
 *  active par défaut (table `saisons`, migration 0008) — voir
 *  CONTEXTE_PROJET.md, Phase 0 de la feuille de route "développement total". */
export async function getSaisons(): Promise<Saison[]> {
  const { data, error } = await supabase
    .from('saisons')
    .select('libelle, date_debut, date_fin, active')
    .order('libelle', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    libelle: s.libelle,
    dateDebut: s.date_debut,
    dateFin: s.date_fin,
    active: s.active,
  }));
}

export async function getSaisonActive(): Promise<string> {
  const { data, error } = await supabase
    .from('saisons')
    .select('libelle')
    .eq('active', true)
    .single();
  if (error) throw error;
  return data.libelle;
}
