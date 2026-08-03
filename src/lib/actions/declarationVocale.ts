'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { envoyerEmail, chargerLogoClub } from '@/lib/email';
import { emailClarificationConcours } from '@/lib/emailTemplates';
import { creerLignesParticipation } from '@/lib/participationsConcours';
import type { Licencie } from '@/lib/fuzzyMatch';
import {
  transcrireAudio,
  extraireDeclaration,
  resoudrePartenaires,
  listerAmbiguitesChamps,
  estAuCalendrierFederation,
  genererJeton,
  adresseReponse,
  resumerExtraction,
  type Ambiguite,
} from '@/lib/declarationVocaleTraitement';

type Resultat =
  | { ok: true; statut: 'enregistre' | 'clarification_envoyee'; resume: string }
  | { ok: false; error: string };

/** Déclaration d'une participation à un concours à partir d'un vocal et
 *  d'un selfie d'équipe, enregistrés depuis le téléphone (idée Jérôme du
 *  03/08/2026). Chemin alternatif à creerParticipationManuelle() : même
 *  résultat en base, saisie différente.
 *
 *  "Chef d'équipe" n'est pas un rôle : c'est le déclarant, pour ce
 *  concours-là. Son identité vient de mon_id_personne(), jamais du client.
 *
 *  Quand l'extraction ne résout pas tout (partenaire non reconnu, montant
 *  non dit), on n'abandonne pas et on ne devine pas : les lignes sûres sont
 *  créées au statut 'a_clarifier' — invisibles pour le paiement — et un
 *  e-mail part demander le complément, dont la réponse est traitée par
 *  /api/webhooks/resend-entrant. */
export async function traiterDeclarationVocale(data: {
  saison: string;
  audioChemin: string;
  photoChemin: string | null;
}): Promise<Resultat> {
  const supabase = await createClient();

  const { data: autorise } = await supabase.rpc('est_utilisateur_autorise');
  if (!autorise) return { ok: false, error: 'Réservé aux licenciés connectés.' };

  const { data: monId } = await supabase.rpc('mon_id_personne');
  if (!monId) return { ok: false, error: 'Aucune fiche licencié trouvée pour ta session — contacte le comité.' };

  // 1. Récupération de l'audio déposé par le navigateur, puis transcription.
  const { data: fichier, error: errFichier } = await supabase.storage
    .from('photos-concours')
    .download(data.audioChemin);
  if (errFichier || !fichier) return { ok: false, error: "Impossible de relire l'enregistrement audio." };

  let transcript: string;
  try {
    transcript = await transcrireAudio(fichier, data.audioChemin.split('/').pop() || 'vocal.webm');
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Transcription impossible.' };
  }
  if (!transcript) {
    return { ok: false, error: "Je n'ai rien entendu dans cet enregistrement — réessaie en parlant plus près du micro." };
  }

  // 2. Extraction structurée du texte (même modèle Gemini que l'assistant Caro).
  let extrait;
  try {
    extrait = await extraireDeclaration(transcript);
  } catch {
    return { ok: false, error: "Je n'ai pas réussi à analyser ta déclaration — réessaie ou passe par le formulaire." };
  }

  // 3. Rapprochement des partenaires cités avec les licenciés de la saison.
  const { data: licenciesData } = await supabase.rpc('licencies_saison', { p_saison: data.saison });
  const licencies = (licenciesData ?? []) as Licencie[];
  const { ids: partenaireIds, ambiguites: ambiguitesNoms } = resoudrePartenaires(
    extrait.partenaires,
    licencies,
    monId
  );

  const date = extrait.date ?? new Date().toISOString().slice(0, 10);
  const ambiguites: Ambiguite[] = [...ambiguitesNoms, ...listerAmbiguitesChamps(extrait)];
  const resume = resumerExtraction(extrait, date);

  const horsCalendrier = !(await estAuCalendrierFederation(supabase, data.saison, date));

  // 4a. Tout est résolu : mêmes lignes que la saisie manuelle, statut normal.
  if (ambiguites.length === 0) {
    const creation = await creerLignesParticipation(supabase, monId, {
      saison: data.saison,
      date,
      club: extrait.club!.trim(),
      pays: 'LU',
      horsCalendrier,
      horsPays: false,
      inscriptionMontant: extrait.inscriptionMontant,
      repasInclus: extrait.repasInclus ?? false,
      partenaireIds,
      notes: extrait.concours ? `Déclaré au vocal — ${extrait.concours}` : 'Déclaré au vocal',
      source: 'vocal',
      statut: 'en_attente',
      transcript,
      donneesExtraites: extrait,
      photoEquipeChemin: data.photoChemin,
    });
    if (!creation.ok) return creation;

    revalidatePath('/concours');
    revalidatePath('/outils/remboursements');
    return { ok: true, statut: 'enregistre', resume };
  }

  // 4b. Incomplet : on garde ce qui est sûr, on demande le reste par e-mail.
  const jeton = genererJeton();
  const clubProvisoire = extrait.club?.trim();
  let participationsIds: number[] = [];

  if (clubProvisoire) {
    const creation = await creerLignesParticipation(supabase, monId, {
      saison: data.saison,
      date,
      club: clubProvisoire,
      pays: 'LU',
      horsCalendrier,
      horsPays: false,
      inscriptionMontant: extrait.inscriptionMontant,
      repasInclus: extrait.repasInclus ?? false,
      partenaireIds,
      notes: 'Déclaré au vocal — en attente de précisions',
      source: 'vocal',
      statut: 'a_clarifier',
      transcript,
      donneesExtraites: extrait,
      photoEquipeChemin: data.photoChemin,
    });
    if (!creation.ok) return creation;
    participationsIds = creation.ids ?? [];
  }

  const { error: errDossier } = await supabase.from('declarations_vocales_clarification').insert({
    jeton,
    personne_declarant_id: monId,
    saison: data.saison,
    transcript,
    donnees_extraites: { ...extrait, date, horsCalendrier },
    ambiguites,
    photo_equipe_chemin: data.photoChemin,
    participations_ids: participationsIds,
  });
  if (errDossier) return { ok: false, error: errDossier.message };

  const { data: moi } = await supabase.rpc('mes_informations_personnelles');
  if (moi?.email) {
    await envoyerEmail({
      destinataire: moi.email,
      sujet: 'Ta déclaration de concours — il me manque une précision',
      html: emailClarificationConcours({
        prenom: moi.prenom,
        resume,
        questions: ambiguites.map((a) => a.question),
      }),
      attachments: [{ filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' }],
      replyTo: adresseReponse(jeton) ?? undefined,
    });
  }

  revalidatePath('/concours');
  return { ok: true, statut: 'clarification_envoyee', resume };
}
