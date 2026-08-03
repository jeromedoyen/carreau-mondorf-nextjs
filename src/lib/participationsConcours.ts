import type { createClient } from '@/lib/supabase/server';

type Client = Awaited<ReturnType<typeof createClient>>;

export type Resultat = { ok: true; ids?: number[] } | { ok: false; error: string };

/** Sources de saisie "par un licencié pour son équipe" — par opposition à
 *  'auto' (listes générées par la trésorerie depuis les résultats). Le
 *  contrôle anti-doublon doit couvrir les deux : sans ça, un concours
 *  déclaré au vocal puis resaisi au formulaire par un partenaire passerait
 *  deux fois en remboursement. */
const SOURCES_EQUIPE = ['manuel', 'vocal'] as const;

export type DonneesParticipationEquipe = {
  saison: string;
  date: string;
  club: string;
  pays: string;
  horsCalendrier: boolean;
  horsPays: boolean;
  /** Null tant qu'il n'est pas connu (déclaration vocale sans montant dit) :
   *  le trigger laisse alors montant_final à null, à compléter avant paiement. */
  inscriptionMontant: number | null;
  repasInclus: boolean;
  /** Autres joueurs de l'équipe, en plus du chef. */
  partenaireIds: number[];
  notes?: string | null;
  source: (typeof SOURCES_EQUIPE)[number];
  statut?: 'a_clarifier' | 'en_attente';
  transcript?: string | null;
  donneesExtraites?: unknown;
  photoEquipeChemin?: string | null;
};

/** Crée les lignes participations_concours d'une équipe (le chef + ses
 *  partenaires, une ligne chacun) après contrôle anti-doublon. Extrait de
 *  creerParticipationManuelle() pour être partagé avec la déclaration
 *  vocale : les deux chemins doivent produire exactement la même forme de
 *  données, seule la façon de les collecter change.
 *
 *  L'appelant est responsable d'avoir vérifié l'identité du chef d'équipe
 *  via mon_id_personne() — ce module ne fait jamais confiance à un id
 *  fourni par le client. */
export async function creerLignesParticipation(
  supabase: Client,
  chefEquipeId: number,
  data: DonneesParticipationEquipe
): Promise<Resultat> {
  const idsEquipe = [chefEquipeId, ...data.partenaireIds];

  // Anti-doublon (cahier des charges §3.2) : un concours déjà enregistré
  // (même date + club, tous joueurs de l'équipe confondus) ne doit pas être
  // resaisi par un partenaire — vérifié en amont avec un message clair,
  // plutôt qu'un rejet muet côté base.
  const { data: existants } = await supabase
    .from('participations_concours')
    .select('id, personne_id')
    .eq('date', data.date)
    .ilike('club', data.club.trim())
    .in('source', SOURCES_EQUIPE)
    .eq('supprime', false)
    .in('personne_id', idsEquipe);
  if (existants && existants.length > 0) {
    return { ok: false, error: 'Ce concours est déjà enregistré pour un ou plusieurs joueurs de cette équipe.' };
  }

  const base = {
    saison: data.saison,
    type: 'Concours' as const,
    source: data.source,
    chef_equipe_id: chefEquipeId,
    date: data.date,
    club: data.club.trim(),
    pays: data.pays || 'LU',
    hors_calendrier: data.horsCalendrier,
    hors_pays: data.horsPays,
    inscription_montant: data.inscriptionMontant,
    repas_inclus: data.repasInclus,
    notes: data.notes?.trim() || null,
    ...(data.statut ? { statut: data.statut } : {}),
    ...(data.transcript !== undefined ? { transcript: data.transcript } : {}),
    ...(data.donneesExtraites !== undefined ? { donnees_extraites: data.donneesExtraites } : {}),
    ...(data.photoEquipeChemin !== undefined ? { photo_equipe_chemin: data.photoEquipeChemin } : {}),
  };

  const lignes = idsEquipe.map((personneId) => ({ ...base, personne_id: personneId }));
  const { data: creees, error } = await supabase.from('participations_concours').insert(lignes).select('id');
  if (error) return { ok: false, error: error.message };

  return { ok: true, ids: (creees ?? []).map((l) => l.id as number) };
}
