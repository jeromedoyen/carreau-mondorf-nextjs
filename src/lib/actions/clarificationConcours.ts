'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true } | { ok: false; error: string };

/** Complète une déclaration vocale de concours restée en 'a_clarifier'
 *  (03/08/2026) — remplace la réponse par e-mail entrant, abandonnée
 *  faute d'option gratuite chez Resend, par un vrai formulaire dans l'app.
 *  Le déclarant étant de toute façon un licencié connecté, on peut lui
 *  proposer une sélection de partenaire fiable (comme /concours) plutôt
 *  que de réanalyser une réponse en texte libre.
 *
 *  Sécurité : le jeton (non deviné, cf. genererJeton()) donne accès au
 *  dossier, mais seul le déclarant original peut le résoudre — vérifié
 *  via mon_id_personne(), jamais un id transmis par le client. */
export async function repondreClarificationConcours(data: {
  jeton: string;
  club: string | null;
  partenaireIds: number[];
}): Promise<Resultat> {
  const supabase = await createClient();

  const { data: monId } = await supabase.rpc('mon_id_personne');
  if (!monId) return { ok: false, error: 'Réservé aux licenciés connectés.' };

  const { data: dossier } = await supabase.rpc('dossier_clarification_par_jeton', { p_jeton: data.jeton });
  if (!dossier) return { ok: false, error: 'Cette demande de précision est introuvable ou déjà traitée.' };
  if (dossier.personne_declarant_id !== monId) {
    return { ok: false, error: "Ce lien correspond à la déclaration de quelqu'un d'autre." };
  }

  const extrait = (dossier.donnees_extraites ?? {}) as Record<string, unknown>;
  const club = data.club?.trim() || (extrait.club as string | null) || null;
  if (!club) return { ok: false, error: 'Le club / la ville du concours est obligatoire.' };

  const ids = (dossier.participations_ids ?? []) as number[];
  if (ids.length) {
    const { error: errMaj } = await supabase
      .from('participations_concours')
      .update({ statut: 'en_attente', club })
      .in('id', ids);
    if (errMaj) return { ok: false, error: errMaj.message };
  }

  // N'ajoute que les partenaires pas déjà couverts par une ligne existante
  // (ceux déjà résolus au moment de la déclaration initiale).
  const { data: existantes } = await supabase
    .from('participations_concours')
    .select('personne_id')
    .in('id', ids.length ? ids : [-1]);
  const dejaPresents = new Set((existantes ?? []).map((l) => l.personne_id as number));
  const manquants = data.partenaireIds.filter((id) => id !== monId && !dejaPresents.has(id));

  if (manquants.length) {
    const modele = {
      saison: dossier.saison,
      type: 'Concours' as const,
      source: 'vocal' as const,
      chef_equipe_id: monId,
      date: (extrait.date as string) ?? new Date().toISOString().slice(0, 10),
      club,
      pays: 'LU',
      hors_calendrier: (extrait.horsCalendrier as boolean) ?? true,
      hors_pays: false,
      statut: 'en_attente' as const,
      transcript: dossier.transcript,
      donnees_extraites: extrait,
      photo_equipe_chemin: dossier.photo_equipe_chemin,
      notes: 'Déclaré au vocal — complété via le lien de clarification',
    };
    const { error: errInsert } = await supabase
      .from('participations_concours')
      .insert(manquants.map((personneId) => ({ ...modele, personne_id: personneId })));
    if (errInsert) return { ok: false, error: errInsert.message };
  }

  const { error: errDossier } = await supabase
    .from('declarations_vocales_clarification')
    .update({ statut: 'resolu', reponse_recue_le: new Date().toISOString() })
    .eq('jeton', data.jeton);
  if (errDossier) return { ok: false, error: errDossier.message };

  revalidatePath('/concours');
  revalidatePath('/outils/remboursements');
  return { ok: true };
}
