'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true } | { ok: false; error: string };

export type DemandeSaisie = {
  typeDemande: 'Inscription' | 'Réinscription';
  nom: string;
  prenom: string;
  dateNaissance: string;
  sexe?: string;
  nationalite?: string;
  adresse: string;
  codePostalVille: string;
  telephone: string;
  email: string;
  typeAdhesionSouhaite?: string;
  droitImage: boolean;
  message?: string;
  consentReglement: boolean;
  consentDonnees: boolean;
};

/** Port de submitInscription() (carreau-mondorf-app/Code.gs:608) — formulaire
 *  PUBLIC, aucune session requise. Utilise le client anonyme (lib/supabase.ts),
 *  pas le client avec session (server.ts) : il n'y a justement pas de session
 *  à ce stade. Validation serveur des champs essentiels, jamais uniquement
 *  côté navigateur — même principe que l'original. */
export async function soumettreDemandeAdhesion(data: DemandeSaisie): Promise<Resultat> {
  const requis: (keyof DemandeSaisie)[] = [
    'nom', 'prenom', 'dateNaissance', 'adresse', 'codePostalVille', 'telephone', 'email',
  ];
  for (const champ of requis) {
    if (!String(data[champ] ?? '').trim()) return { ok: false, error: `Champ manquant : ${champ}` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return { ok: false, error: 'Adresse email invalide.' };
  }
  if (!data.consentReglement || !data.consentDonnees) {
    return { ok: false, error: 'Les engagements (règlement intérieur et traitement des données) sont obligatoires.' };
  }

  const { error } = await supabase.from('demandes_adhesion').insert({
    type_demande: data.typeDemande,
    nom: data.nom,
    prenom: data.prenom,
    date_naissance: data.dateNaissance,
    sexe: data.sexe || null,
    nationalite: data.nationalite || null,
    adresse: data.adresse,
    code_postal_ville: data.codePostalVille,
    telephone: data.telephone,
    email: data.email,
    type_adhesion_souhaite: data.typeAdhesionSouhaite || null,
    droit_image: data.droitImage,
    message: data.message || null,
    consent_reglement: data.consentReglement,
    consent_donnees: data.consentDonnees,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

async function verifierCA(client: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await client.rpc('est_membre_ca');
  return !!data;
}

/** Appelée après creerMembre() une fois que le CA a validé/complété les
 *  champs dans MembreForm — relie la demande à la fiche créée et la marque
 *  traitée. Ne recrée jamais la personne elle-même (déjà fait par
 *  creerMembre) : cette action ne fait que classer la demande d'origine. */
export async function marquerDemandeTraitee(demandeId: number, personneId: number): Promise<Resultat> {
  const client = await createClient();
  if (!(await verifierCA(client))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { error } = await client
    .from('demandes_adhesion')
    .update({ statut: 'validee', personne_id: personneId })
    .eq('id', demandeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/membres/demandes');
  return { ok: true };
}

export async function refuserDemande(demandeId: number): Promise<Resultat> {
  const client = await createClient();
  if (!(await verifierCA(client))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { error } = await client.from('demandes_adhesion').update({ statut: 'rejetee' }).eq('id', demandeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/membres/demandes');
  return { ok: true };
}
