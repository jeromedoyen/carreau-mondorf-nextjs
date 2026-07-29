'use server';

import { revalidatePath } from 'next/cache';
import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase/server';
import { envoyerEmail, chargerLogoClub } from '@/lib/email';
import { emailBienvenue, emailConfirmationDemande, emailAlerteNouvelleDemande, emailRefusDemande } from '@/lib/emailTemplates';
import { CLUB } from '@/lib/club';
import { envoyerAppelPaiementEmail } from './paiements';

type Resultat = { ok: true } | { ok: false; error: string };

/** Désactive temporairement l'envoi réel de l'alerte CA (28/07/2026,
 *  demande Jérôme) — période de tests d'automatisation du workflow
 *  d'adhésion avec un compte "testeur" recréé à volonté : sans ce
 *  garde-fou, chaque test spammerait toute la boîte partagée du comité.
 *  L'envoi est simulé (loggé) au lieu d'être réellement effectué.
 *  Repasser à false une fois les tests terminés. */
const SIMULER_ALERTE_CA = true;

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

  // Accusé de réception à l'applicant + alerte au comité (28/07/2026,
  // workflow adhésion bout-en-bout) — best-effort : la demande est déjà
  // enregistrée à ce stade, un SMTP indisponible ne doit jamais faire
  // échouer la soumission elle-même.
  try {
    await envoyerEmail({
      destinataire: data.email,
      sujet: 'Ta demande a bien été reçue',
      html: emailConfirmationDemande({ prenom: data.prenom }),
      attachments: [{ filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' }],
    });
  } catch {
    // Silencieux — rien à remonter à un applicant anonyme, la demande est déjà enregistrée.
  }
  try {
    if (SIMULER_ALERTE_CA) {
      console.log(
        `[SIMULATION — alerte CA désactivée pendant les tests] destinataire=${CLUB.email} sujet="Nouvelle demande d'adhésion — ${data.prenom} ${data.nom}"`
      );
    } else {
      await envoyerEmail({
        destinataire: CLUB.email,
        sujet: `Nouvelle demande d'adhésion — ${data.prenom} ${data.nom}`,
        html: emailAlerteNouvelleDemande({ nomComplet: `${data.prenom} ${data.nom}`, typeDemande: data.typeDemande }),
        attachments: [{ filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' }],
      });
    }
  } catch {
    // Idem — le CA verra quand même la demande sur /membres/demandes.
  }

  return { ok: true };
}

async function verifierCA(client: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await client.rpc('est_membre_ca');
  return !!data;
}

const MONTANT_COTISATION_DEFAUT = 20;

/** Appelée après creerMembre() une fois que le CA a validé/complété les
 *  champs dans MembreForm — relie la demande à la fiche créée et la marque
 *  traitée. Ne recrée jamais la personne elle-même (déjà fait par
 *  creerMembre) : cette action ne fait que classer la demande d'origine.
 *
 *  Phase D du workflow adhésion : génère aussi l'appel de paiement "Carte
 *  de membre {année}" pour Inscription ET Réinscription, plutôt qu'un
 *  geste manuel séparé sur /outils/paiements. Montant lu depuis
 *  parametres_club.montant_carte_membre (configurable par le CA, migration
 *  0032) — 20 EUR si non renseigné. La Licence, elle, reste manuelle :
 *  même quand un montant est configuré, il varie chaque saison selon ce
 *  que communique la FLBP (fédération) et n'est jamais garanti à jour au
 *  moment du traitement d'une demande — le CA la crée lui-même. Un échec
 *  de création de l'appel ne fait jamais échouer la validation de la
 *  demande (la fiche/adhésion existe déjà à ce stade) : juste un
 *  avertissement remonté à l'appelant, même principe que
 *  creerAccesEtEnvoyerBienvenue.
 *
 *  Le geste "cotisation payée ou non" est unique — la case à cocher
 *  "Cotisation payée" de la section Adhésion (MembreForm.tsx), jamais une
 *  seconde case séparée (retour Jérôme, 29/07/2026 : les deux se
 *  contredisaient — "cotisation payée" ET "envoyer l'appel" cochées en
 *  même temps n'avait pas de sens). Payée → l'appel est créé directement
 *  au statut "payee" avec le mode de paiement renseigné, aucun email
 *  envoyé. Pas payée → l'appel part par email tout de suite (QR SEPA
 *  inclus, cf. envoyerAppelPaiementEmail), pour permettre un paiement à
 *  distance sans second geste manuel sur /outils/paiements. */
export async function marquerDemandeTraitee(
  demandeId: number,
  personneId: number,
  annee: string,
  nomComplet: string,
  cotisationPayee: boolean,
  modePaiement?: string
): Promise<Resultat> {
  const client = await createClient();
  if (!(await verifierCA(client))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { error } = await client
    .from('demandes_adhesion')
    .update({ statut: 'validee', personne_id: personneId })
    .eq('id', demandeId);
  if (error) return { ok: false, error: error.message };

  const { data: parametres } = await client
    .from('parametres_club')
    .select('montant_carte_membre')
    .eq('id', 1)
    .maybeSingle();

  const { data: appel, error: errAppel } = await client
    .from('appels_paiement')
    .insert({
      personne_id: personneId,
      type: 'Carte de membre',
      montant: parametres?.montant_carte_membre ?? MONTANT_COTISATION_DEFAUT,
      description: `Carte de membre ${annee} — ${nomComplet}`,
      ...(cotisationPayee
        ? { statut: 'payee', mode_paiement: modePaiement || null, payee_le: new Date().toISOString() }
        : {}),
    })
    .select('id')
    .single();

  revalidatePath('/membres/demandes');
  revalidatePath('/outils/paiements');
  if (errAppel) {
    return { ok: false, error: `Demande validée, mais l'appel de cotisation n'a pas pu être créé : ${errAppel.message}` };
  }

  if (!cotisationPayee) {
    const resultatEnvoi = await envoyerAppelPaiementEmail(appel.id);
    if (!resultatEnvoi.ok) {
      return {
        ok: false,
        error: `Demande validée, appel de cotisation créé, mais l'envoi de l'email a échoué : ${resultatEnvoi.error}`,
      };
    }
  }

  return { ok: true };
}

/** Phase A du workflow adhésion : appelée depuis MembreForm.tsx juste
 *  après marquerDemandeTraitee(), uniquement pour une Inscription initiale
 *  (pas une Réinscription — la personne a déjà un accès dans ce cas).
 *  Crée la ligne `acces` (RPC creer_acces_licencie(), migration 0028) puis
 *  envoie l'email de bienvenue — dans cet ordre : un envoi qui échoue ne
 *  doit jamais empêcher l'accès d'exister, mais on ne veut pas non plus
 *  prévenir quelqu'un qui n'a en fait pas d'accès. */
export async function creerAccesEtEnvoyerBienvenue(
  nom: string,
  prenom: string,
  email: string,
  estLicencie: boolean
): Promise<Resultat> {
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
      html: emailBienvenue({ prenom, email, estLicencie }),
      attachments: [{ filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' }],
    });
  } catch (e) {
    // L'accès existe déjà à ce stade (create côté RPC a réussi) — un email
    // qui échoue (SMTP indisponible...) ne doit pas faire perdre au CA le
    // travail déjà fait, juste le prévenir pour qu'il informe autrement.
    return { ok: false, error: `Accès créé, mais l'email de bienvenue n'a pas pu être envoyé : ${(e as Error).message}` };
  }

  return { ok: true };
}

export type ReinscriptionSaisie = Omit<DemandeSaisie, 'typeDemande'>;

/** Phase B du workflow adhésion : soumission de la réinscription depuis
 *  Moncaro (licencié déjà connecté, pas un formulaire public) — passe par
 *  le client avec session (server.ts), pas le client anonyme utilisé par
 *  soumettreDemandeAdhesion(). La RPC soumettre_reinscription() (migration
 *  0029) résout elle-même le personne_id depuis l'email de session,
 *  jamais transmis par le client. */
export async function soumettreReinscription(data: ReinscriptionSaisie): Promise<Resultat> {
  const client = await createClient();
  const { data: autorise } = await client.rpc('est_utilisateur_autorise');
  if (!autorise) return { ok: false, error: 'Action réservée aux licenciés connectés.' };

  const { error } = await client.rpc('soumettre_reinscription', {
    p_nom: data.nom,
    p_prenom: data.prenom,
    p_date_naissance: data.dateNaissance,
    p_sexe: data.sexe || null,
    p_nationalite: data.nationalite || null,
    p_adresse: data.adresse,
    p_code_postal_ville: data.codePostalVille,
    p_telephone: data.telephone,
    p_email: data.email,
    p_type_adhesion_souhaite: data.typeAdhesionSouhaite || null,
    p_droit_image: data.droitImage,
    p_message: data.message || null,
    p_consent_reglement: data.consentReglement,
    p_consent_donnees: data.consentDonnees,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/membres/demandes');
  return { ok: true };
}

export async function refuserDemande(demandeId: number): Promise<Resultat> {
  const client = await createClient();
  if (!(await verifierCA(client))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { data: demande } = await client
    .from('demandes_adhesion')
    .select('prenom, email')
    .eq('id', demandeId)
    .maybeSingle();

  const { error } = await client.from('demandes_adhesion').update({ statut: 'rejetee' }).eq('id', demandeId);
  if (error) return { ok: false, error: error.message };

  // Email de refus (28/07/2026, workflow adhésion bout-en-bout) — jusqu'ici
  // un refus était un silence radio pour l'applicant. Best-effort : la
  // demande est déjà classée à ce stade, ne jamais faire échouer le refus
  // lui-même pour un souci SMTP.
  if (demande?.email) {
    try {
      await envoyerEmail({
        destinataire: demande.email,
        sujet: 'Ta demande d’adhésion',
        html: emailRefusDemande({ prenom: demande.prenom }),
        attachments: [{ filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' }],
      });
    } catch {
      // Silencieux — la demande est déjà classée "rejetee".
    }
  }

  revalidatePath('/membres/demandes');
  return { ok: true };
}
