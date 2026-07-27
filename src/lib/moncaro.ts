import type { SupabaseClient } from '@supabase/supabase-js';

export type MonAdhesion = {
  type: string;
  categorie: string | null;
  cotisationPayee: boolean | null;
  cotisationMontant: number | null;
  cotisationDate: string | null;
  licencePayee: boolean | null;
  licenceMontant: number | null;
  licenceDate: string | null;
};

/** RPC security definer mon_adhesion() (migration 0026) — ne renvoie que
 *  la ligne d'adhésion de la session courante, jamais le registre. null si
 *  aucune fiche ne correspond à l'email de connexion, OU si la migration
 *  0026 n'a pas encore été appliquée en base ("function does not exist") :
 *  cette carte est une carte parmi d'autres sur /moncaro, jamais une
 *  raison de faire planter toute la page — dégradation silencieuse plutôt
 *  qu'un throw, même principe que les autres RPC "mon/ma ..." du module. */
export async function getMonAdhesion(supabase: SupabaseClient, saison: string): Promise<MonAdhesion | null> {
  const { data, error } = await supabase.rpc('mon_adhesion', { p_saison: saison });
  if (error) return null;
  if (!data) return null;
  return {
    type: data.type,
    categorie: data.categorie,
    cotisationPayee: data.cotisation_payee,
    cotisationMontant: data.cotisation_montant,
    cotisationDate: data.cotisation_date,
    licencePayee: data.licence_payee,
    licenceMontant: data.licence_montant,
    licenceDate: data.licence_date,
  };
}
