import { createClient } from './supabase/server';
import type { PersonneAvecAdhesion } from './types';

type LignePersonne = {
  id: number;
  nom: string;
  prenom: string;
  sexe: string | null;
  date_naissance: string | null;
  nationalite: string | null;
  adresse: string | null;
  code_postal_ville: string | null;
  telephone: string | null;
  email: string | null;
  droit_image: boolean | null;
};

type LigneAdhesion = {
  id: number;
  personne_id: number;
  annee: string;
  type: string;
  licence: string | null;
  categorie: string | null;
  classe: string | null;
  cotisation_payee: boolean | null;
  licence_payee: boolean | null;
};

/** Contrairement aux lectures publiques de src/lib/data.ts (client anonyme),
 *  ceci passe par le client Supabase avec session (server.ts) : la RLS
 *  ("lecture CA uniquement", cf. 0004_registre_membres.sql) ne renvoie des
 *  lignes que si l'utilisateur connecté est membre du CA — un licencié
 *  simple ou un visiteur anonyme reçoit un tableau vide, pas une erreur. */
export async function getRegistreMembres(annee: string): Promise<PersonneAvecAdhesion[]> {
  const supabase = await createClient();

  const { data: personnesData, error: errP } = await supabase
    .from('personnes')
    .select('id, nom, prenom, sexe, date_naissance, nationalite, adresse, code_postal_ville, telephone, email, droit_image')
    .eq('supprime', false)
    .order('nom', { ascending: true });
  if (errP) throw errP;
  const personnes = (personnesData ?? []) as LignePersonne[];

  const { data: adhesionsData, error: errA } = await supabase
    .from('adhesions')
    .select('id, personne_id, annee, type, licence, categorie, classe, cotisation_payee, licence_payee')
    .eq('annee', annee)
    .eq('supprime', false);
  if (errA) throw errA;
  const adhesionParPersonne = new Map(
    ((adhesionsData ?? []) as LigneAdhesion[]).map((a) => [a.personne_id, a])
  );

  return personnes.map((p) => {
    const a = adhesionParPersonne.get(p.id);
    return {
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      sexe: p.sexe,
      dateNaissance: p.date_naissance,
      nationalite: p.nationalite,
      adresse: p.adresse,
      codePostalVille: p.code_postal_ville,
      telephone: p.telephone,
      email: p.email,
      droitImage: p.droit_image,
      adhesion: a
        ? {
            id: a.id,
            personneId: a.personne_id,
            annee: a.annee,
            type: a.type,
            licence: a.licence,
            categorie: a.categorie,
            classe: a.classe,
            cotisationPayee: a.cotisation_payee,
            licencePayee: a.licence_payee,
          }
        : null,
    };
  });
}

export async function estMembreCA(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('est_membre_ca');
  if (error) return false;
  return !!data;
}
