import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  classer,
  statistiquesEquipes,
  statistiquesParticipants,
  partiesMaxSansRevanche,
  type FormatTournoi,
  type PartieJouee,
  type ParametresTournoi,
  type StatsClassees,
} from './moteur';

export type Tournoi = {
  id: number;
  nom: string;
  dateTournoi: string;
  format: FormatTournoi;
  tailleEquipe: number;
  nbParties: number;
  nbTerrains: number;
  pointsVictoire: number;
  statut: 'preparation' | 'en_cours' | 'termine';
  notes: string | null;
  creeParEmail: string;
};

export type Participant = {
  id: number;
  personneId: number | null;
  nom: string;
  equipeDepart: number | null;
  ordre: number;
};

/** Une rencontre telle que l'écran de saisie en a besoin : avec son id. */
export type RencontreDetail = {
  id: number;
  terrain: number;
  equipeAId: number;
  equipeBId: number;
  scoreA: number | null;
  scoreB: number | null;
};

export type PartieDetail = {
  id: number;
  numero: number;
  equipeExempteId: number | null;
  revancheForcee: boolean;
  rencontres: RencontreDetail[];
};

export type TournoiComplet = {
  tournoi: Tournoi;
  participants: Participant[];
  /** Équipes permanentes (format equipes_fixes). Vide en mêlée. */
  equipesPermanentes: { id: number; numero: number; membres: number[] }[];
  parties: PartieJouee[];
  /** Même chose, mais avec les ids : c'est ce que consomme l'écran de saisie. */
  partiesDetail: PartieDetail[];
  /** Toutes les équipes du tournoi, par id — pour afficher qui joue où. */
  equipesParId: Record<number, { numero: number; membres: number[] }>;
  /** Classement par équipe (equipes_fixes) ou par joueur (mêlée). */
  classement: StatsClassees[];
  /** Libellé d'une ligne de classement : « Équipe 3 » ou le nom du joueur. */
  libelle: (id: number) => string;
  /** Même chose sous forme sérialisable, pour les composants client. */
  libelles: Record<number, string>;
};

export type ParametresLisibles = ParametresTournoi;

function versParametres(t: Tournoi): ParametresTournoi {
  return {
    format: t.format,
    tailleEquipe: t.tailleEquipe,
    nbParties: t.nbParties,
    nbTerrains: t.nbTerrains,
    pointsVictoire: t.pointsVictoire,
  };
}

export function parametresDe(t: Tournoi): ParametresTournoi {
  return versParametres(t);
}

type LigneTournoi = {
  id: number;
  nom: string;
  date_tournoi: string;
  format: FormatTournoi;
  taille_equipe: number;
  nb_parties: number;
  nb_terrains: number;
  points_victoire: number;
  statut: Tournoi['statut'];
  notes: string | null;
  cree_par_email: string;
};

function versTournoi(l: LigneTournoi): Tournoi {
  return {
    id: l.id,
    nom: l.nom,
    dateTournoi: l.date_tournoi,
    format: l.format,
    tailleEquipe: l.taille_equipe,
    nbParties: l.nb_parties,
    nbTerrains: l.nb_terrains,
    pointsVictoire: l.points_victoire,
    statut: l.statut,
    notes: l.notes,
    creeParEmail: l.cree_par_email,
  };
}

export async function getTournois(): Promise<Tournoi[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('tournois')
    .select('id, nom, date_tournoi, format, taille_equipe, nb_parties, nb_terrains, points_victoire, statut, notes, cree_par_email')
    .order('date_tournoi', { ascending: false })
    .order('id', { ascending: false });
  if (error || !data) return [];
  return (data as LigneTournoi[]).map(versTournoi);
}

/**
 * Charge un tournoi entier en quatre requêtes plutôt qu'en cascade : les
 * appariements se calculent sur l'historique COMPLET (adversaires déjà
 * rencontrés, terrains déjà occupés, coéquipiers déjà eus), donc tout doit
 * être là de toute façon. Un tournoi de club, c'est quelques centaines de
 * lignes au maximum — inutile de paginer.
 */
export async function getTournoiComplet(id: number): Promise<TournoiComplet | null> {
  const supabase = await createClient();

  const { data: ligne, error } = await supabase
    .from('tournois')
    .select('id, nom, date_tournoi, format, taille_equipe, nb_parties, nb_terrains, points_victoire, statut, notes, cree_par_email')
    .eq('id', id)
    .maybeSingle();
  if (error || !ligne) return null;
  const tournoi = versTournoi(ligne as LigneTournoi);

  const [{ data: participantsBruts }, { data: partiesBrutes }, { data: equipesBrutes }] =
    await Promise.all([
      supabase
        .from('tournoi_participants')
        .select('id, personne_id, nom, equipe_depart, ordre')
        .eq('tournoi_id', id)
        .order('ordre')
        .order('id'),
      supabase
        .from('tournoi_parties')
        .select('id, numero, equipe_exempte_id, revanche_forcee')
        .eq('tournoi_id', id)
        .order('numero'),
      supabase
        .from('tournoi_equipes')
        .select('id, partie_id, numero, tournoi_equipe_membres (participant_id)')
        .eq('tournoi_id', id)
        .order('numero'),
    ]);

  const participants: Participant[] = (participantsBruts ?? []).map((p) => ({
    id: p.id as number,
    personneId: (p.personne_id as number | null) ?? null,
    nom: p.nom as string,
    equipeDepart: (p.equipe_depart as number | null) ?? null,
    ordre: (p.ordre as number) ?? 0,
  }));

  type LigneEquipe = {
    id: number;
    partie_id: number | null;
    numero: number;
    tournoi_equipe_membres: { participant_id: number }[] | null;
  };
  const equipes = ((equipesBrutes ?? []) as unknown as LigneEquipe[]).map((e) => ({
    id: e.id,
    partieId: e.partie_id,
    numero: e.numero,
    membres: (e.tournoi_equipe_membres ?? []).map((m) => m.participant_id),
  }));

  const equipesPermanentes = equipes
    .filter((e) => e.partieId === null)
    .map((e) => ({ id: e.id, numero: e.numero, membres: e.membres }));

  const partieIds = (partiesBrutes ?? []).map((p) => p.id as number);
  const { data: rencontresBrutes } = partieIds.length
    ? await supabase
        .from('tournoi_rencontres')
        .select('id, partie_id, terrain, equipe_a_id, equipe_b_id, score_a, score_b')
        .in('partie_id', partieIds)
        .order('terrain')
    : { data: [] };

  const parties: PartieJouee[] = (partiesBrutes ?? []).map((p) => {
    const partieId = p.id as number;
    // En équipes fixes les équipes sont permanentes (partie_id null) : elles
    // participent à toutes les parties. En mêlée, seules celles tirées pour
    // cette partie-là comptent.
    const equipesDeLaPartie =
      tournoi.format === 'equipes_fixes'
        ? equipesPermanentes
        : equipes.filter((e) => e.partieId === partieId).map((e) => ({ id: e.id, numero: e.numero, membres: e.membres }));

    return {
      numero: p.numero as number,
      equipes: equipesDeLaPartie,
      rencontres: (rencontresBrutes ?? [])
        .filter((r) => r.partie_id === partieId)
        .map((r) => ({
          terrain: r.terrain as number,
          equipeA: r.equipe_a_id as number,
          equipeB: r.equipe_b_id as number,
          scoreA: (r.score_a as number | null) ?? null,
          scoreB: (r.score_b as number | null) ?? null,
        })),
      equipeExempteId: (p.equipe_exempte_id as number | null) ?? null,
    };
  });

  const classement =
    tournoi.format === 'equipes_fixes'
      ? classer(statistiquesEquipes(parties, tournoi.pointsVictoire))
      : classer(
          statistiquesParticipants(
            parties,
            participants.map((p) => p.id),
            tournoi.pointsVictoire,
          ),
        );

  const nomParticipant = new Map(participants.map((p) => [p.id, p.nom]));
  const numeroEquipe = new Map(equipes.map((e) => [e.id, e.numero]));
  const libelle = (idLigne: number) =>
    tournoi.format === 'equipes_fixes'
      ? `Équipe ${numeroEquipe.get(idLigne) ?? idLigne}`
      : (nomParticipant.get(idLigne) ?? `#${idLigne}`);

  const partiesDetail: PartieDetail[] = (partiesBrutes ?? []).map((p) => ({
    id: p.id as number,
    numero: p.numero as number,
    equipeExempteId: (p.equipe_exempte_id as number | null) ?? null,
    revancheForcee: !!p.revanche_forcee,
    rencontres: (rencontresBrutes ?? [])
      .filter((r) => r.partie_id === p.id)
      .map((r) => ({
        id: r.id as number,
        terrain: r.terrain as number,
        equipeAId: r.equipe_a_id as number,
        equipeBId: r.equipe_b_id as number,
        scoreA: (r.score_a as number | null) ?? null,
        scoreB: (r.score_b as number | null) ?? null,
      })),
  }));

  const equipesParId: Record<number, { numero: number; membres: number[] }> = {};
  for (const e of equipes) equipesParId[e.id] = { numero: e.numero, membres: e.membres };

  const libelles: Record<number, string> = {};
  for (const s of classement) libelles[s.id] = libelle(s.id);

  return {
    tournoi,
    participants,
    equipesPermanentes,
    parties,
    partiesDetail,
    equipesParId,
    classement,
    libelle,
    libelles,
  };
}

/**
 * Licenciés proposés à la sélection. On prend le registre entier plutôt que
 * les seuls licenciés de la saison : un tournoi interne accueille aussi des
 * membres non licenciés, et l'organisateur reste libre d'ajouter un invité
 * à la main par-dessus.
 */
export async function getCandidatsParticipants(): Promise<{ id: number; nom: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('personnes')
    .select('id, nom, prenom')
    .eq('supprime', false)
    .order('nom');
  return (data ?? []).map((p) => ({
    id: p.id as number,
    nom: [p.prenom, p.nom].filter(Boolean).join(' ').trim(),
  }));
}

/** Ids des rencontres, pour la saisie des scores côté client. */
export async function getRencontresDePartie(partieId: number) {
  const supabase = await createClient();
  const { data } = await supabase
    .from('tournoi_rencontres')
    .select('id, terrain, equipe_a_id, equipe_b_id, score_a, score_b')
    .eq('partie_id', partieId)
    .order('terrain');
  return data ?? [];
}

/**
 * Nombre de parties au-delà duquel on ne peut plus promettre l'absence de
 * revanche. En équipes fixes, à partir de N−1 le moteur bascule sur un
 * calendrier toutes rondes, qui la garantit ; c'est entre les deux que le
 * système suisse peut coincer.
 */
export function avertissementNbParties(nbEquipes: number, nbParties: number): string | null {
  if (nbEquipes < 2) return null;
  const max = partiesMaxSansRevanche(nbEquipes);
  if (nbParties > max) {
    return `Avec ${nbEquipes} équipes, on ne peut pas dépasser ${max} parties sans que des équipes se rencontrent deux fois.`;
  }
  if (nbParties === max) {
    return `${nbParties} parties pour ${nbEquipes} équipes : chaque équipe rencontrera toutes les autres exactement une fois (toutes rondes).`;
  }
  return null;
}
