'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

export type PersonneSaisie = {
  nom: string;
  prenom: string;
  sexe?: string;
  dateNaissance?: string;
  nationalite?: string;
  adresse?: string;
  codePostalVille?: string;
  telephone?: string;
  email?: string;
  droitImage?: boolean;
  notes?: string;
};

export type AdhesionSaisie = {
  annee: string;
  type: string;
  licence?: string;
  categorie?: string;
  classe?: string;
  cotisationPayee?: boolean;
};

/** Crée une personne et son adhésion pour la saison en cours en une seule
 *  action — c'est le vrai geste métier ("nouveau membre"), plutôt que deux
 *  écrans séparés qui laisseraient une fiche sans adhésion entre les deux. */
export async function creerMembre(personne: PersonneSaisie, adhesion: AdhesionSaisie): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!personne.nom || !personne.prenom) return { ok: false, error: 'Nom et prénom obligatoires.' };
  if (!adhesion.annee || !adhesion.type) return { ok: false, error: 'Année et type d’adhésion obligatoires.' };

  // Le numéro de téléphone doit rester du texte tel quel (jamais recalculé
  // en nombre) — un "+352..." saisi tel quel dans Sheets/Excel se fait
  // silencieusement tronquer/réinterpréter par ces logiciels (pense-bête
  // Jérôme, 24/07/2026). Postgres ne fait courir aucun risque de ce genre
  // pour une colonne `text`, mais on ne fait confiance à aucune
  // transformation implicite : la valeur saisie est stockée verbatim.
  const { data: inserted, error: errPersonne } = await supabase
    .from('personnes')
    .insert({
      nom: personne.nom,
      prenom: personne.prenom,
      sexe: personne.sexe || null,
      date_naissance: personne.dateNaissance || null,
      nationalite: personne.nationalite || null,
      adresse: personne.adresse || null,
      code_postal_ville: personne.codePostalVille || null,
      telephone: personne.telephone || null,
      email: personne.email || null,
      droit_image: personne.droitImage ?? null,
      notes: personne.notes || null,
    })
    .select('id')
    .single();
  if (errPersonne) return { ok: false, error: errPersonne.message };

  const { error: errAdhesion } = await supabase.from('adhesions').insert({
    personne_id: inserted.id,
    annee: adhesion.annee,
    type: adhesion.type,
    licence: adhesion.licence || null,
    categorie: adhesion.categorie || null,
    classe: adhesion.classe || null,
    cotisation_payee: adhesion.cotisationPayee ?? false,
  });
  if (errAdhesion) return { ok: false, error: errAdhesion.message };

  revalidatePath('/membres');
  return { ok: true, id: inserted.id };
}

export async function modifierPersonne(id: number, personne: PersonneSaisie): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!personne.nom || !personne.prenom) return { ok: false, error: 'Nom et prénom obligatoires.' };

  const { error } = await supabase
    .from('personnes')
    .update({
      nom: personne.nom,
      prenom: personne.prenom,
      sexe: personne.sexe || null,
      date_naissance: personne.dateNaissance || null,
      nationalite: personne.nationalite || null,
      adresse: personne.adresse || null,
      code_postal_ville: personne.codePostalVille || null,
      telephone: personne.telephone || null,
      email: personne.email || null,
      droit_image: personne.droitImage ?? null,
      notes: personne.notes || null,
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/membres');
  revalidatePath(`/membres/${id}`);
  return { ok: true };
}

/** Crée ou met à jour l'adhésion d'une personne pour une année donnée
 *  (une par année, cf. contrainte métier de 0004_registre_membres.sql). */
export async function enregistrerAdhesion(personneId: number, adhesionId: number | null, adhesion: AdhesionSaisie): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!adhesion.annee || !adhesion.type) return { ok: false, error: 'Année et type d’adhésion obligatoires.' };

  const valeurs = {
    personne_id: personneId,
    annee: adhesion.annee,
    type: adhesion.type,
    licence: adhesion.licence || null,
    categorie: adhesion.categorie || null,
    classe: adhesion.classe || null,
    cotisation_payee: adhesion.cotisationPayee ?? false,
  };

  const { error } = adhesionId
    ? await supabase.from('adhesions').update(valeurs).eq('id', adhesionId)
    : await supabase.from('adhesions').insert(valeurs);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/membres');
  revalidatePath(`/membres/${personneId}`);
  return { ok: true };
}

export async function supprimerMembre(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { error } = await supabase.from('personnes').update({ supprime: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/membres');
  return { ok: true };
}
