/**
 * Lecture et écriture des poules en base (migration 0076) — la traduction entre
 * les tables et le moteur pur (`poules.ts`).
 *
 * Aucune dépendance à Next ni à `server-only` : le client Supabase est INJECTÉ,
 * comme pour les statistiques de Promotion. C'est ce qui permet de rejouer ces
 * fonctions contre la vraie base avec un concours jetable
 * (`scripts/verifier-poules-base.ts`) sans passer par une session de connexion.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { scoreValide } from './moteur';
import {
  classementTableau,
  classerPoule,
  composerPartiePoules,
  nbToursPoule,
  nbToursTableau,
  nomDuTour,
  nomPoule,
  qualification,
  qualifiesParPoule,
  repartitionPoules,
  tableauTermine,
  tirerPoules,
  type ContextePoules,
  type EquipePoules,
  type LignePoule,
  type ModePoule,
  type ParametresPoules,
  type PlaceTableau,
  type PouleDef,
  type PropositionPoules,
  type RencontrePoules,
  type Tableau,
} from './poules';

/** Club supposé d'une équipe composée uniquement de licenciés du club. */
export const CLUB_PAR_DEFAUT = 'Carreau Mondorf';

type Resultat<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export type EquipeAvecClub = EquipePoules & {
  /** Club saisi à la main (null = pas saisi). `club` porte la valeur effective. */
  clubSaisi: string | null;
  membres: number[];
};

export type RencontreAvecId = RencontrePoules & { id: number };

export type EtatPoules = {
  ctx: ContextePoules;
  equipes: EquipeAvecClub[];
  parties: { id: number; numero: number; phase: 'poules' | 'tableaux' | null; libelle: string | null }[];
  rencontres: RencontreAvecId[];
};

// ------------------------------------------------------------------ lecture

export async function lireParametresPoules(
  supabase: SupabaseClient,
  tournoiId: number,
): Promise<ParametresPoules | null> {
  const { data } = await supabase
    .from('tournois')
    .select('format, nb_terrains, points_victoire, poules_mode, poules_taille, poules_qualifies, poules_consolante')
    .eq('id', tournoiId)
    .maybeSingle();
  if (!data || data.format !== 'poules') return null;
  return {
    mode: data.poules_mode as ModePoule,
    taillePoule: data.poules_taille as number,
    qualifies: data.poules_qualifies as number,
    consolante: !!data.poules_consolante,
    pointsVictoire: data.points_victoire as number,
    nbTerrains: data.nb_terrains as number,
  };
}

/** Équipes permanentes du concours, avec leur club (saisi, sinon déduit : que des licenciés du club). */
export async function lireEquipesPoules(supabase: SupabaseClient, tournoiId: number): Promise<EquipeAvecClub[]> {
  const [{ data: equipes }, { data: participants }] = await Promise.all([
    supabase
      .from('tournoi_equipes')
      .select('id, numero, club, tournoi_equipe_membres (participant_id)')
      .eq('tournoi_id', tournoiId)
      .is('partie_id', null)
      .order('numero'),
    supabase.from('tournoi_participants').select('id, personne_id').eq('tournoi_id', tournoiId),
  ]);
  const licencie = new Map((participants ?? []).map((p) => [p.id as number, p.personne_id != null]));
  type Ligne = { id: number; numero: number; club: string | null; tournoi_equipe_membres: { participant_id: number }[] | null };
  return ((equipes ?? []) as unknown as Ligne[]).map((e) => {
    const membres = (e.tournoi_equipe_membres ?? []).map((m) => m.participant_id);
    const saisi = e.club?.trim() ? e.club.trim() : null;
    const deduit = membres.length > 0 && membres.every((m) => licencie.get(m)) ? CLUB_PAR_DEFAUT : null;
    return { id: e.id, numero: e.numero, club: saisi ?? deduit, clubSaisi: saisi, membres };
  });
}

export async function lireEtatPoules(
  supabase: SupabaseClient,
  tournoiId: number,
  params: ParametresPoules,
): Promise<EtatPoules> {
  const [equipes, { data: poulesBrutes }, { data: partiesBrutes }, { data: placesBrutes }] = await Promise.all([
    lireEquipesPoules(supabase, tournoiId),
    supabase
      .from('tournoi_poules')
      .select('id, numero, tournoi_poule_equipes (equipe_id, ordre)')
      .eq('tournoi_id', tournoiId)
      .order('numero'),
    supabase.from('tournoi_parties').select('id, numero, phase, libelle').eq('tournoi_id', tournoiId).order('numero'),
    supabase.from('tournoi_tableau_places').select('tableau, position, equipe_id').eq('tournoi_id', tournoiId),
  ]);

  type LignePoule = { id: number; numero: number; tournoi_poule_equipes: { equipe_id: number; ordre: number }[] | null };
  const poules: PouleDef[] = ((poulesBrutes ?? []) as unknown as LignePoule[]).map((p) => ({
    id: p.id,
    numero: p.numero,
    equipes: [...(p.tournoi_poule_equipes ?? [])].sort((a, b) => a.ordre - b.ordre).map((e) => e.equipe_id),
  }));

  const parties = (partiesBrutes ?? []).map((p) => ({
    id: p.id as number,
    numero: p.numero as number,
    phase: (p.phase as 'poules' | 'tableaux' | null) ?? null,
    libelle: (p.libelle as string | null) ?? null,
  }));
  const numeroDe = new Map(parties.map((p) => [p.id, p.numero]));

  const { data: rencontresBrutes } = parties.length
    ? await supabase
        .from('tournoi_rencontres')
        .select('id, partie_id, terrain, equipe_a_id, equipe_b_id, score_a, score_b, poule_id, tableau, tour, place')
        .in('partie_id', parties.map((p) => p.id))
        .order('terrain')
    : { data: [] };

  const rencontres: RencontreAvecId[] = (rencontresBrutes ?? []).map((r) => ({
    id: r.id as number,
    partieNumero: numeroDe.get(r.partie_id as number) ?? 0,
    phase: r.poule_id != null ? 'poule' : ((r.tableau as Tableau | null) ?? 'principal'),
    pouleId: (r.poule_id as number | null) ?? null,
    tour: (r.tour as number | null) ?? 1,
    place: (r.place as number | null) ?? null,
    terrain: r.terrain as number,
    equipeA: r.equipe_a_id as number,
    equipeB: r.equipe_b_id as number,
    scoreA: (r.score_a as number | null) ?? null,
    scoreB: (r.score_b as number | null) ?? null,
  }));

  const places: PlaceTableau[] = (placesBrutes ?? []).map((p) => ({
    tableau: p.tableau as Tableau,
    position: p.position as number,
    equipeId: (p.equipe_id as number | null) ?? null,
  }));

  return {
    ctx: {
      params,
      equipes: equipes.map((e) => ({ id: e.id, numero: e.numero, club: e.club })),
      poules,
      rencontres,
      places,
    },
    equipes,
    parties,
    rencontres,
  };
}

// ----------------------------------------------------------------- écriture

/** Tire les poules au sort et les enregistre. Refait le tirage si les poules existent déjà ; refusé dès qu'une partie est composée. */
export async function tirerEtEnregistrerPoules(
  supabase: SupabaseClient,
  tournoiId: number,
  params: ParametresPoules,
  alea: () => number = Math.random,
): Promise<Resultat<{ nbPoules: number; conflitsClub: number }>> {
  const { count } = await supabase
    .from('tournoi_parties')
    .select('id', { count: 'exact', head: true })
    .eq('tournoi_id', tournoiId);
  if ((count ?? 0) > 0) {
    return { ok: false, error: 'La première partie est déjà composée : annulez les parties pour refaire le tirage.' };
  }

  const equipes = await lireEquipesPoules(supabase, tournoiId);
  if (equipes.length < 3) return { ok: false, error: "Composez d'abord les équipes : il en faut au moins 3." };

  const rep = repartitionPoules(equipes.length, params.taillePoule, params.mode);
  if ('erreur' in rep) return { ok: false, error: rep.erreur };
  const tirage = tirerPoules(equipes, rep.tailles, alea);

  await supabase.from('tournoi_poules').delete().eq('tournoi_id', tournoiId);

  const { data: creees, error } = await supabase
    .from('tournoi_poules')
    .insert(tirage.poules.map((_, i) => ({ tournoi_id: tournoiId, numero: i + 1 })))
    .select('id, numero');
  if (error || !creees) return { ok: false, error: error?.message ?? 'Création des poules impossible.' };
  const idParNumero = new Map(creees.map((c) => [c.numero as number, c.id as number]));

  const lignes = tirage.poules.flatMap((ids, i) =>
    ids.map((equipeId, k) => ({ poule_id: idParNumero.get(i + 1)!, equipe_id: equipeId, ordre: k + 1 })),
  );
  const { error: eE } = await supabase.from('tournoi_poule_equipes').insert(lignes);
  if (eE) {
    await supabase.from('tournoi_poules').delete().eq('tournoi_id', tournoiId);
    return { ok: false, error: eE.message };
  }
  return { ok: true, nbPoules: tirage.poules.length, conflitsClub: tirage.conflitsClub };
}

export async function supprimerPoules(supabase: SupabaseClient, tournoiId: number): Promise<void> {
  await supabase.from('tournoi_poules').delete().eq('tournoi_id', tournoiId);
}

export async function enregistrerClubsEquipes(
  supabase: SupabaseClient,
  tournoiId: number,
  clubs: { equipeId: number; club: string | null }[],
): Promise<Resultat> {
  for (const c of clubs) {
    const club = c.club?.trim() ? c.club.trim().slice(0, 80) : null;
    const { error } = await supabase
      .from('tournoi_equipes')
      .update({ club })
      .eq('id', c.equipeId)
      .eq('tournoi_id', tournoiId);
    if (error) return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Persiste une partie proposée par le moteur : la partie, ses rencontres et, la première fois, les positions des tableaux. */
export async function enregistrerPartiePoules(
  supabase: SupabaseClient,
  tournoiId: number,
  numero: number,
  prop: PropositionPoules,
): Promise<Resultat<{ partieId: number }>> {
  const { data: partie, error } = await supabase
    .from('tournoi_parties')
    .insert({ tournoi_id: tournoiId, numero, phase: prop.phase, libelle: prop.libelle })
    .select('id')
    .single();
  if (error || !partie) return { ok: false, error: error?.message ?? 'Création de la partie impossible.' };

  const defaire = async (message: string) => {
    // les rencontres et les positions partent en cascade avec la partie
    await supabase.from('tournoi_parties').delete().eq('id', partie.id);
    return { ok: false as const, error: message };
  };

  if (prop.nouvellesPlaces.length) {
    const { error: eP } = await supabase.from('tournoi_tableau_places').insert(
      prop.nouvellesPlaces.map((p) => ({
        tournoi_id: tournoiId,
        partie_id: partie.id,
        tableau: p.tableau,
        position: p.position,
        equipe_id: p.equipeId,
      })),
    );
    if (eP) return defaire(eP.message);
  }

  const { error: eR } = await supabase.from('tournoi_rencontres').insert(
    prop.rencontres.map((r) => ({
      partie_id: partie.id,
      terrain: r.terrain,
      equipe_a_id: r.equipeA,
      equipe_b_id: r.equipeB,
      poule_id: r.pouleId,
      tableau: r.tableau,
      tour: r.tour,
      place: r.place,
    })),
  );
  if (eR) return defaire(eR.message);
  return { ok: true, partieId: partie.id as number };
}

// ------------------------------------------------------------ vue pour l'écran

export type VuePoules = {
  mode: ModePoule;
  taille: number;
  qualifies: number;
  consolante: boolean;
  poules: {
    id: number;
    numero: number;
    nom: string;
    equipes: number[];
    classement: LignePoule[];
    complet: boolean;
    /** Nombre de qualifiés de cette poule. */
    qualifiesK: number;
  }[];
  /** Club effectif de chaque équipe, et ce qui a été saisi à la main. */
  clubs: Record<number, string | null>;
  clubsSaisis: Record<number, string | null>;
  /** Paires d'équipes du même club réunies par le tirage actuel (0 = idéal). */
  conflitsClub: number;
  tableaux: {
    tableau: Tableau;
    nbTours: number;
    places: (number | null)[];
    classement: { id: number; rang: number | null; tourElimination: number | null }[];
    termine: boolean;
  }[];
  /** Libellé de chaque rencontre : « Poule A · tour 2 », « Tableau principal · Demi-finales »… */
  etiquettes: Record<number, string>;
  avertissements: string[];
  /** Plus rien à composer : poules et tableaux sont joués. */
  fini: boolean;
  /** Libellé de la prochaine partie à composer, quand elle est possible. */
  prochaine: string | null;
};

const NOM_TABLEAU: Record<Tableau, string> = { principal: 'Tableau principal', consolante: 'Consolante' };

export function construireVuePoules(etat: EtatPoules): VuePoules {
  const { ctx, rencontres, equipes, parties } = etat;
  const { params, poules, places } = ctx;
  const but = params.pointsVictoire;

  const clubs: Record<number, string | null> = {};
  const clubsSaisis: Record<number, string | null> = {};
  for (const e of equipes) {
    clubs[e.id] = e.club;
    clubsSaisis[e.id] = e.clubSaisi;
  }

  const vuePoules = poules.map((p) => {
    const siennes = rencontres.filter((r) => r.phase === 'poule' && r.pouleId === p.id);
    const cl = classerPoule(params.mode, p.equipes, siennes, but);
    return {
      id: p.id,
      numero: p.numero,
      nom: nomPoule(p.numero),
      equipes: p.equipes,
      classement: cl.lignes,
      complet: cl.complet,
      qualifiesK: qualifiesParPoule(params, p.equipes.length),
    };
  });

  let conflitsClub = 0;
  for (const p of poules) {
    const m = new Map<string, number>();
    for (const id of p.equipes) {
      const c = clubs[id]?.trim().toLowerCase();
      if (c) m.set(c, (m.get(c) ?? 0) + 1);
    }
    for (const n of m.values()) conflitsClub += (n * (n - 1)) / 2;
  }

  const tableaux = (['principal', 'consolante'] as Tableau[])
    .map((tableau) => {
      const pl = places.filter((p) => p.tableau === tableau).sort((a, b) => a.position - b.position).map((p) => p.equipeId);
      const jouees = rencontres.filter((r) => r.phase === tableau);
      return {
        tableau,
        nbTours: pl.length >= 2 ? Math.log2(pl.length) : 0,
        places: pl,
        classement: pl.length >= 2 ? classementTableau(pl, jouees, but) : [],
        termine: pl.length >= 2 && tableauTermine(pl, jouees, but),
      };
    })
    .filter((t) => t.places.length >= 2);

  const etiquettes: Record<number, string> = {};
  for (const r of rencontres) {
    if (r.phase === 'poule') {
      const poule = poules.find((p) => p.id === r.pouleId);
      let detail = `tour ${r.tour}`;
      if (poule && params.mode === 'repechage' && poule.equipes.length === 4) {
        if (r.tour === 3) detail = 'barrage pour la 2ᵉ place';
        else if (r.tour === 2) {
          const [a, b, c, d] = poule.equipes;
          const gagnant = (x: number, y: number) => {
            const t1 = rencontres.find(
              (q) => q.pouleId === poule.id && q.tour === 1 && ((q.equipeA === x && q.equipeB === y) || (q.equipeA === y && q.equipeB === x)),
            );
            return t1 && scoreValide(t1, but) ? (t1.scoreA! > t1.scoreB! ? t1.equipeA : t1.equipeB) : null;
          };
          const gagnants = [gagnant(a, b), gagnant(c, d)];
          detail = gagnants.includes(r.equipeA) ? 'match des gagnants' : 'match des perdants';
        }
      }
      etiquettes[r.id] = `Poule ${poule ? nomPoule(poule.numero) : '?'} · ${detail}`;
    } else {
      const t = tableaux.find((x) => x.tableau === r.phase);
      const nb = t ? nbToursTableau(t.places.filter((x) => x != null).length) : 0;
      etiquettes[r.id] = `${NOM_TABLEAU[r.phase as Tableau]} · ${nomDuTour(nb, r.tour)}`;
    }
  }

  // Qu'y a-t-il à composer ensuite ? Seulement si la dernière partie est saisie en entier.
  const derniere = parties[parties.length - 1];
  const derniereComplete = derniere
    ? rencontres.filter((r) => r.partieNumero === derniere.numero).every((r) => scoreValide(r, but))
    : true;
  let fini = false;
  let prochaine: string | null = null;
  const avertissements: string[] = [];
  if (poules.length > 0 && derniereComplete) {
    try {
      const suite = composerPartiePoules(ctx);
      if (suite.fini) fini = true;
      else {
        prochaine = suite.proposition.libelle;
        avertissements.push(...suite.proposition.avertissements);
      }
    } catch {
      /* résultats manquants : rien à proposer pour l'instant */
    }
  }
  // Égalités parfaites à la frontière de qualification, annoncées avant de composer le tableau.
  if (poules.length > 0 && places.length === 0 && derniereComplete && !fini) {
    const toursTotal = Math.max(...poules.map((p) => nbToursPoule(params.mode, p.equipes.length)));
    const toursFaits = Math.max(0, ...rencontres.filter((r) => r.phase === 'poule').map((r) => r.tour));
    if (toursFaits >= toursTotal) {
      for (const a of qualification(ctx).avertissements) if (!avertissements.includes(a)) avertissements.push(a);
    }
  }

  return {
    mode: params.mode,
    taille: params.taillePoule,
    qualifies: params.qualifies,
    consolante: params.consolante,
    poules: vuePoules,
    clubs,
    clubsSaisis,
    conflitsClub,
    tableaux,
    etiquettes,
    avertissements,
    fini,
    prochaine,
  };
}
