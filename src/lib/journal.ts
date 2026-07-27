import { createClient } from './supabase/server';

export type EntreeJournal = {
  id: number;
  tableCible: string;
  ligneId: number;
  action: 'creation' | 'modification' | 'suppression';
  auteurEmail: string;
  creeLe: string;
  avant: unknown;
  apres: unknown;
};

/** Journal des modifications (journal_modifications, migration 0005) —
 *  alimenté automatiquement par un trigger sur chaque table d'écriture CA
 *  (personnes, adhesions, appels_paiement, manifestations, congés...),
 *  jamais écrit directement par le client. Répond au besoin de traçabilité
 *  de Jérôme (27/07/2026) : "je trouve la trace de qui a fait quoi, pour
 *  tous les membres du CA" — auteur_email vient du JWT de session au
 *  moment de l'action, pas d'un champ saisi. Lecture CA-only (RLS). */
export async function getJournal(limite = 200): Promise<EntreeJournal[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('journal_modifications')
    .select('id, table_cible, ligne_id, action, auteur_email, cree_le, avant, apres')
    .order('cree_le', { ascending: false })
    .limit(limite);
  if (error) throw error;
  return (data ?? []).map((j) => ({
    id: j.id,
    tableCible: j.table_cible,
    ligneId: j.ligne_id,
    action: j.action,
    auteurEmail: j.auteur_email,
    creeLe: j.cree_le,
    avant: j.avant,
    apres: j.apres,
  }));
}
