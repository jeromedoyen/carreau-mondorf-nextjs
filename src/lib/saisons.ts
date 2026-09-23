import { supabase } from '@/lib/supabase';

export type Saison = {
  id: number;
  libelle: string;
  dateDebut: string;
  dateFin: string;
  active: boolean;
  /** Division du club au championnat national cette saison-là —
   *  « National D2 » jusqu'en 2026, « National D1 » dès 2027 (migration
   *  0069). Source de vérité de tous les libellés du module National. */
  divisionNationale: string;
};

export const DIVISION_PAR_DEFAUT = 'National D2';

/** Le libellé de la division du club pour une saison — celui de la
 *  saison demandée si elle existe, sinon la valeur historique. */
export function divisionDeSaison(saisons: Saison[], saison: string): string {
  return saisons.find((s) => s.libelle === saison)?.divisionNationale ?? DIVISION_PAR_DEFAUT;
}

export async function getDivisionNationale(saison: string): Promise<string> {
  const { data, error } = await supabase
    .from('saisons')
    .select('division_nationale')
    .eq('libelle', saison)
    .maybeSingle();
  if (error) throw error;
  return (data?.division_nationale as string | undefined) ?? DIVISION_PAR_DEFAUT;
}

/** Source de vérité transversale pour la liste des saisons et la saison
 *  active par défaut (table `saisons`, migration 0008) — voir
 *  CONTEXTE_PROJET.md, Phase 0 de la feuille de route "développement total". */
export async function getSaisons(): Promise<Saison[]> {
  const { data, error } = await supabase
    .from('saisons')
    .select('id, libelle, date_debut, date_fin, active, division_nationale')
    .order('libelle', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((s) => ({
    id: s.id,
    libelle: s.libelle,
    dateDebut: s.date_debut,
    dateFin: s.date_fin,
    active: s.active,
    divisionNationale: (s.division_nationale as string | null) ?? DIVISION_PAR_DEFAUT,
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
