import { createClient } from './supabase/server';

export type Demande = {
  id: number;
  creeLe: string;
  typeDemande: string;
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe: string | null;
  nationalite: string | null;
  adresse: string;
  codePostalVille: string;
  telephone: string;
  email: string;
  typeAdhesionSouhaite: string | null;
  droitImage: boolean;
  message: string | null;
  statut: string;
};

/** Demandes en attente (statut 'a_traiter') — réservé au CA via la RLS
 *  ("lecture CA uniquement", cf. 0015_demandes_adhesion.sql). */
export async function getDemandesEnAttente(): Promise<Demande[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('demandes_adhesion')
    .select(
      'id, cree_le, type_demande, nom, prenom, date_naissance, sexe, nationalite, adresse, code_postal_ville, telephone, email, type_adhesion_souhaite, droit_image, message, statut'
    )
    .eq('statut', 'a_traiter')
    .order('cree_le', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id,
    creeLe: d.cree_le,
    typeDemande: d.type_demande,
    nom: d.nom,
    prenom: d.prenom,
    dateNaissance: d.date_naissance,
    sexe: d.sexe,
    nationalite: d.nationalite,
    adresse: d.adresse,
    codePostalVille: d.code_postal_ville,
    telephone: d.telephone,
    email: d.email,
    typeAdhesionSouhaite: d.type_adhesion_souhaite,
    droitImage: d.droit_image,
    message: d.message,
    statut: d.statut,
  }));
}

/** Une demande précise, quel que soit son statut — utilisée pour préremplir
 *  MembreForm au moment du traitement. */
export async function getDemande(id: number): Promise<Demande | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('demandes_adhesion')
    .select(
      'id, cree_le, type_demande, nom, prenom, date_naissance, sexe, nationalite, adresse, code_postal_ville, telephone, email, type_adhesion_souhaite, droit_image, message, statut'
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    creeLe: data.cree_le,
    typeDemande: data.type_demande,
    nom: data.nom,
    prenom: data.prenom,
    dateNaissance: data.date_naissance,
    sexe: data.sexe,
    nationalite: data.nationalite,
    adresse: data.adresse,
    codePostalVille: data.code_postal_ville,
    telephone: data.telephone,
    email: data.email,
    typeAdhesionSouhaite: data.type_adhesion_souhaite,
    droitImage: data.droit_image,
    message: data.message,
    statut: data.statut,
  };
}
