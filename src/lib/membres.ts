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
  notes: string | null;
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
/** Liste "Prénom Nom" pour l'autocomplétion du champ bénévole d'un créneau
 *  (demande via /pb, note #106 : "soit de la liste des membres et licenciés
 *  du club, soit de la saisie manuelle d'un nom"). Ne renvoie que le nom —
 *  pas le reste de la fiche (email, téléphone...) — même si la RLS
 *  ("lecture CA uniquement") limite de toute façon l'accès aux membres du
 *  CA, cohérent avec le fait que le champ reste une saisie libre pour tout
 *  licencié non-CA (cf. CreneauAffectations.tsx). */
export async function getNomsMembres(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from('personnes').select('prenom, nom').eq('supprime', false);
  if (error || !data) return [];
  return data
    .map((p) => `${p.prenom} ${p.nom}`.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'fr'));
}

export async function getRegistreMembres(annee: string): Promise<PersonneAvecAdhesion[]> {
  const supabase = await createClient();

  const { data: personnesData, error: errP } = await supabase
    .from('personnes')
    .select('id, nom, prenom, sexe, date_naissance, nationalite, adresse, code_postal_ville, telephone, email, droit_image, notes')
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

  return personnes.map((p) => versPersonneAvecAdhesion(p, adhesionParPersonne.get(p.id)));
}

function versPersonneAvecAdhesion(p: LignePersonne, a?: LigneAdhesion): PersonneAvecAdhesion {
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
    notes: p.notes,
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
}

/** Fiche d'une personne, avec son adhésion pour l'année donnée si elle
 *  existe — utilisé par l'écran d'édition (/membres/[id]). */
export async function getPersonne(id: number, annee: string): Promise<PersonneAvecAdhesion | null> {
  const supabase = await createClient();

  const { data: p, error: errP } = await supabase
    .from('personnes')
    .select('id, nom, prenom, sexe, date_naissance, nationalite, adresse, code_postal_ville, telephone, email, droit_image, notes')
    .eq('id', id)
    .eq('supprime', false)
    .maybeSingle();
  if (errP) throw errP;
  if (!p) return null;

  const { data: a, error: errA } = await supabase
    .from('adhesions')
    .select('id, personne_id, annee, type, licence, categorie, classe, cotisation_payee, licence_payee')
    .eq('personne_id', id)
    .eq('annee', annee)
    .eq('supprime', false)
    .maybeSingle();
  if (errA) throw errA;

  return versPersonneAvecAdhesion(p as LignePersonne, (a as LigneAdhesion) ?? undefined);
}

/** Retrouve la fiche existante d'un licencié à partir de son email —
 *  utilisée par le traitement CA d'une demande de Réinscription (Phase C
 *  du workflow adhésion) : la personne existe déjà, on édite sa fiche au
 *  lieu d'en créer une nouvelle. null si aucune fiche ne correspond
 *  (ne devrait pas arriver pour une réinscription légitime, mais la RPC
 *  soumettre_reinscription() ne garantit pas l'unicité de l'email côté
 *  base — mieux vaut dégrader que planter). */
export async function getPersonneParEmail(email: string, annee: string): Promise<PersonneAvecAdhesion | null> {
  const supabase = await createClient();

  const { data: p, error: errP } = await supabase
    .from('personnes')
    .select('id, nom, prenom, sexe, date_naissance, nationalite, adresse, code_postal_ville, telephone, email, droit_image, notes')
    .ilike('email', email.trim())
    .eq('supprime', false)
    .maybeSingle();
  if (errP) throw errP;
  if (!p) return null;

  const { data: a, error: errA } = await supabase
    .from('adhesions')
    .select('id, personne_id, annee, type, licence, categorie, classe, cotisation_payee, licence_payee')
    .eq('personne_id', p.id)
    .eq('annee', annee)
    .eq('supprime', false)
    .maybeSingle();
  if (errA) throw errA;

  return versPersonneAvecAdhesion(p as LignePersonne, (a as LigneAdhesion) ?? undefined);
}

export async function estMembreCA(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('est_membre_ca');
  if (error) return false;
  return !!data;
}

/** Inclut déjà le CA (voir est_membre_commission_sportive(), 0044) — accès
 *  complet aux statistiques/détails de rencontre pour le CA ET la
 *  commission sportive (retour Jérôme via /pb, 01/08/2026). */
export async function estMembreCommissionSportive(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('est_membre_commission_sportive');
  if (error) return false;
  return !!data;
}
