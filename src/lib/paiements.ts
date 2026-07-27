import { createClient } from './supabase/server';

export type ParametresClub = {
  nomBeneficiaire: string;
  iban: string;
  bic: string | null;
  ville: string | null;
  montantCarteMembre: number | null;
  montantLicence: number | null;
};

export type TypeAppelPaiement = 'Carte de membre' | 'Licence' | 'Carte de membre + Licence' | 'Autre';

export type AppelPaiement = {
  id: number;
  personneId: number | null;
  personneNom: string | null;
  personneEmail: string | null;
  type: TypeAppelPaiement;
  montant: number;
  description: string;
  reference: string | null;
  statut: 'en_attente' | 'payee' | 'annulee';
  modePaiement: string | null;
  creeLe: string;
  payeeLe: string | null;
  emailEnvoyeLe: string | null;
};

export async function getParametresClub(): Promise<ParametresClub | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('parametres_club')
    .select('nom_beneficiaire, iban, bic, ville, montant_carte_membre, montant_licence')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    nomBeneficiaire: data.nom_beneficiaire,
    iban: data.iban,
    bic: data.bic,
    ville: data.ville,
    montantCarteMembre: data.montant_carte_membre,
    montantLicence: data.montant_licence,
  };
}

export async function getAppelsPaiement(): Promise<AppelPaiement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('appels_paiement')
    .select('id, personne_id, type, montant, description, reference, statut, mode_paiement, cree_le, payee_le, email_envoye_le, personnes(nom, prenom, email)')
    .eq('supprime', false)
    .order('cree_le', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((a) => {
    const personne = Array.isArray(a.personnes) ? a.personnes[0] : a.personnes;
    return {
      id: a.id,
      personneId: a.personne_id,
      personneNom: personne ? `${personne.prenom} ${personne.nom}` : null,
      personneEmail: personne?.email ?? null,
      type: a.type,
      montant: a.montant,
      description: a.description,
      reference: a.reference,
      statut: a.statut,
      modePaiement: a.mode_paiement,
      creeLe: a.cree_le,
      payeeLe: a.payee_le,
      emailEnvoyeLe: a.email_envoye_le,
    };
  });
}
