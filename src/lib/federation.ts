import { createClient } from './supabase/server';

export type ControleFederationHistorique = {
  id: number;
  dateImport: string;
  nomFichier: string;
  nbOk: number;
  nbDivergence: number;
  nbManquantClub: number;
  nbManquantFederation: number;
};

/** Historique des contrôles déjà effectués (toutes saisons confondues,
 *  les plus récents d'abord) — équivalent de getHistoriqueImportsFederation
 *  côté v1. RLS "lecture CA" (0019_controle_federation.sql). */
export async function getHistoriqueControlesFederation(): Promise<ControleFederationHistorique[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('controles_federation')
    .select('id, date_import, nom_fichier, nb_ok, nb_divergence, nb_manquant_club, nb_manquant_federation')
    .order('date_import', { ascending: false })
    .limit(20);
  if (error) throw error;

  return (data ?? []).map((h) => ({
    id: h.id,
    dateImport: h.date_import,
    nomFichier: h.nom_fichier,
    nbOk: h.nb_ok,
    nbDivergence: h.nb_divergence,
    nbManquantClub: h.nb_manquant_club,
    nbManquantFederation: h.nb_manquant_federation,
  }));
}
