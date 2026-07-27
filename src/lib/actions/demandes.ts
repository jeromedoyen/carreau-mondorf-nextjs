'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { envoyerEmail } from '@/lib/email';

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

/** Phase A du workflow adhésion : appelée depuis MembreForm.tsx juste
 *  après marquerDemandeTraitee(), uniquement pour une Inscription initiale
 *  (pas une Réinscription — la personne a déjà un accès dans ce cas).
 *  Crée la ligne `acces` (RPC creer_acces_licencie(), migration 0028) puis
 *  envoie l'email de bienvenue — dans cet ordre : un envoi qui échoue ne
 *  doit jamais empêcher l'accès d'exister, mais on ne veut pas non plus
 *  prévenir quelqu'un qui n'a en fait pas d'accès. */
export async function creerAccesEtEnvoyerBienvenue(nom: string, prenom: string, email: string): Promise<Resultat> {
  const client = await createClient();
  if (!(await verifierCA(client))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { error: errAcces } = await client.rpc('creer_acces_licencie', {
    p_email: email,
    p_nom: `${prenom} ${nom}`,
  });
  if (errAcces) return { ok: false, error: errAcces.message };

  try {
    await envoyerEmail({
      destinataire: email,
      sujet: 'Bienvenue au Carreau Boules et Pétanque Mondorf',
      html: `
        <p>Bonjour ${prenom},</p>
        <p>Ton adhésion au Carreau Boules et Pétanque Mondorf a été validée — bienvenue au club !</p>
        <p>Tu peux dès maintenant te connecter à l'espace licenciés avec cette adresse email (${email}) :
          <a href="https://carreau-mondorf.com/connexion">carreau-mondorf.com/connexion</a>.
          Un code de connexion à 6 chiffres te sera envoyé par email à chaque connexion, aucun mot de passe à retenir.</p>
        <p>À bientôt au boulodrome !</p>
        <p>Le comité du Carreau Boules et Pétanque Mondorf</p>
      `,
    });
  } catch (e) {
    // L'accès existe déjà à ce stade (create côté RPC a réussi) — un email
    // qui échoue (SMTP indisponible...) ne doit pas faire perdre au CA le
    // travail déjà fait, juste le prévenir pour qu'il informe autrement.
    return { ok: false, error: `Accès créé, mais l'email de bienvenue n'a pas pu être envoyé : ${(e as Error).message}` };
  }

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
