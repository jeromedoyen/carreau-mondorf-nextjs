'use server';

import { revalidatePath } from 'next/cache';
import QRCode from 'qrcode';
import { createClient } from '@/lib/supabase/server';
import { envoyerEmail, chargerLogoClub } from '@/lib/email';
import { emailAppelPaiement, emailMerciPaiement } from '@/lib/emailTemplates';
import { genererPayloadSepaQr } from '@/lib/sepaQr';
import { genererCommunicationAppelPaiement } from '@/lib/communicationPaiement';
import type { TypeAppelPaiement } from '@/lib/paiements';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

export async function enregistrerParametresClub(data: {
  nomBeneficiaire: string;
  iban: string;
  bic?: string;
  ville?: string;
  montantCarteMembre?: number;
  montantLicence?: number;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.nomBeneficiaire.trim() || !data.iban.trim()) {
    return { ok: false, error: 'Bénéficiaire et IBAN obligatoires.' };
  }

  const { error } = await supabase.from('parametres_club').upsert({
    id: 1,
    nom_beneficiaire: data.nomBeneficiaire.trim(),
    iban: data.iban.trim(),
    bic: data.bic?.trim() || null,
    ville: data.ville?.trim() || null,
    montant_carte_membre: data.montantCarteMembre ?? null,
    montant_licence: data.montantLicence ?? null,
    maj_le: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true };
}

export async function creerAppelPaiement(data: {
  personneId?: number;
  type: TypeAppelPaiement;
  montant: number;
  description: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.description.trim() || !(data.montant > 0)) {
    return { ok: false, error: 'Description et montant (positif) obligatoires.' };
  }

  const { data: inserted, error } = await supabase
    .from('appels_paiement')
    .insert({
      personne_id: data.personneId ?? null,
      type: data.type,
      montant: data.montant,
      description: data.description.trim(),
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true, id: inserted.id };
}

/** Retour Jérôme (27/07/2026) : "je crée une demande de paiement et basta,
 *  ça ne va pas" — il faut pouvoir envoyer la demande par email. Une fois
 *  envoyée, l'appel passe visuellement dans une seconde liste
 *  ("relances envoyées", cf. email_envoye_le en migration 0031) pendant
 *  que le trésorier suit les paiements reçus ; un appel jamais relancé
 *  (paiement en main propre, QR flashé sur place) reste marquable payé
 *  directement, sans jamais passer par ici. */
export async function envoyerAppelPaiementEmail(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const [{ data: appel, error: errAppel }, { data: parametres, error: errParametres }, { data: saison }] =
    await Promise.all([
      supabase
        .from('appels_paiement')
        .select('id, type, description, montant, personne_id, personnes(nom, prenom, email)')
        .eq('id', id)
        .single(),
      supabase.from('parametres_club').select('nom_beneficiaire, iban, bic').eq('id', 1).maybeSingle(),
      supabase.from('saisons').select('libelle').eq('active', true).maybeSingle(),
    ]);
  if (errAppel || !appel) return { ok: false, error: errAppel?.message ?? 'Appel de paiement introuvable.' };
  if (errParametres) return { ok: false, error: errParametres.message };
  if (!parametres) return { ok: false, error: 'Coordonnées bancaires du club non renseignées.' };

  const personne = Array.isArray(appel.personnes) ? appel.personnes[0] : appel.personnes;
  if (!personne?.email) return { ok: false, error: 'Aucun email associé à cet appel de paiement.' };

  const communication = genererCommunicationAppelPaiement({
    type: appel.type,
    annee: saison?.libelle ?? String(new Date().getFullYear()),
    personneNom: `${personne.prenom} ${personne.nom}`,
  });

  const payload = genererPayloadSepaQr({
    nomBeneficiaire: parametres.nom_beneficiaire,
    iban: parametres.iban,
    bic: parametres.bic,
    montant: appel.montant,
    communication,
  });
  const qrBuffer = await QRCode.toBuffer(payload, { width: 400, margin: 2 });

  try {
    await envoyerEmail({
      destinataire: personne.email,
      sujet: `Appel à cotisation — ${appel.description}`,
      html: emailAppelPaiement({
        prenom: personne.prenom,
        description: appel.description,
        montant: appel.montant,
        reference: communication,
        nomBeneficiaire: parametres.nom_beneficiaire,
        iban: parametres.iban,
        bic: parametres.bic,
      }),
      attachments: [
        { filename: 'qr-paiement.png', content: qrBuffer, cid: 'qr-cotisation' },
        { filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' },
      ],
    });
  } catch (e) {
    return { ok: false, error: `Échec de l'envoi : ${(e as Error).message}` };
  }

  const { error: errUpdate } = await supabase
    .from('appels_paiement')
    .update({ email_envoye_le: new Date().toISOString() })
    .eq('id', id);
  if (errUpdate) return { ok: false, error: errUpdate.message };

  revalidatePath('/outils/paiements');
  return { ok: true };
}

/** Retour Jérôme (27/07/2026) : une fois le trésorier "OK", l'info doit
 *  remonter jusqu'à la fiche du membre — Moncaro ("Ma cotisation") lit
 *  `adhesions.cotisation_payee`/`licence_payee`, pas `appels_paiement`, ces
 *  deux tables étaient jusqu'ici décorrélées (décision explicite du
 *  27/07 : "paiement manuel pour le moment", mais côté rapprochement, pas
 *  côté propagation du résultat). Marquer un appel payé met donc aussi à
 *  jour l'adhésion de la personne pour la saison active — meilleur effort,
 *  ne fait jamais échouer le "payé" lui-même si l'appel n'est pas lié à
 *  une fiche, ou pour un type "Autre" hors cotisation/licence.
 *
 *  Envoie aussi un email de remerciement à la personne (29/07/2026,
 *  demande Jérôme) — best-effort, ne fait jamais échouer la validation du
 *  paiement elle-même si le SMTP est indisponible. */
export async function marquerAppelPaye(id: number, modePaiement: string): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { data: appel, error: errAppel } = await supabase
    .from('appels_paiement')
    .select('id, type, personne_id, description, montant, personnes(prenom, email)')
    .eq('id', id)
    .single();
  if (errAppel || !appel) return { ok: false, error: errAppel?.message ?? 'Appel de paiement introuvable.' };

  const { error } = await supabase
    .from('appels_paiement')
    .update({ statut: 'payee', mode_paiement: modePaiement || null, payee_le: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  revalidatePath('/outils/paiements-en-attente');

  if (appel.personne_id && appel.type !== 'Autre') {
    const { data: saison } = await supabase.from('saisons').select('libelle').eq('active', true).maybeSingle();
    if (saison) {
      const champs: Record<string, string | boolean> = {};
      const aujourdhui = new Date().toISOString().slice(0, 10);
      if (appel.type === 'Carte de membre' || appel.type === 'Carte de membre + Licence') {
        champs.cotisation_payee = true;
        champs.cotisation_date = aujourdhui;
      }
      if (appel.type === 'Licence' || appel.type === 'Carte de membre + Licence') {
        champs.licence_payee = true;
        champs.licence_date = aujourdhui;
      }
      const { error: errAdhesion } = await supabase
        .from('adhesions')
        .update(champs)
        .eq('personne_id', appel.personne_id)
        .eq('annee', saison.libelle);
      if (errAdhesion) {
        return {
          ok: false,
          error: `Appel marqué payé, mais la mise à jour de l'adhésion a échoué : ${errAdhesion.message}`,
        };
      }
      revalidatePath('/moncaro');
    }
  }

  const personne = Array.isArray(appel.personnes) ? appel.personnes[0] : appel.personnes;
  if (personne?.email) {
    try {
      await envoyerEmail({
        destinataire: personne.email,
        sujet: `Paiement reçu — ${appel.description}`,
        html: emailMerciPaiement({ prenom: personne.prenom, description: appel.description, montant: appel.montant }),
        attachments: [{ filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' }],
      });
    } catch {
      // Silencieux — le paiement est déjà marqué payé, seul le remerciement échoue.
    }
  }

  return { ok: true };
}

export async function annulerAppelPaiement(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('appels_paiement').update({ statut: 'annulee' }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true };
}

export async function supprimerAppelPaiement(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('appels_paiement').update({ supprime: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/paiements');
  return { ok: true };
}
