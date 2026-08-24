/**
 * Moteur de tournoi — appariements, terrains, classement.
 *
 * Volontairement sans Supabase, sans React et sans effet de bord : tout entre
 * par les paramètres et ressort par la valeur de retour. C'est ce qui permet
 * de le simuler sur des milliers de tournois (`scripts/verifier-moteur.ts`)
 * avant de le brancher, plutôt que de découvrir un appariement bancal le jour
 * du concours.
 *
 * Deux formats (voir `supabase/migrations/0059_tournois.sql`) :
 *   - `equipes_fixes` : les équipes ne changent pas, on apparie par nombre de
 *     victoires (système suisse). Classement par équipe.
 *   - `melee` : les équipes sont retirées au sort à chaque partie parmi les
 *     joueurs, en regroupant les joueurs de même niveau. Classement individuel.
 */

export type IdEquipe = number;
export type IdParticipant = number;
export type FormatTournoi = 'equipes_fixes' | 'melee';

/** Une équipe telle qu'elle joue une partie. `id` null = reste à créer (mêlée). */
export type EquipeComposee = {
  id: IdEquipe | null;
  numero: number;
  membres: IdParticipant[];
};

export type RencontreJouee = {
  terrain: number;
  equipeA: IdEquipe;
  equipeB: IdEquipe;
  scoreA: number | null;
  scoreB: number | null;
};

/** Une partie déjà jouée (ou en cours), telle que lue en base. */
export type PartieJouee = {
  numero: number;
  equipes: { id: IdEquipe; numero: number; membres: IdParticipant[] }[];
  rencontres: RencontreJouee[];
  equipeExempteId: IdEquipe | null;
};

/** Une partie proposée par le moteur, pas encore persistée. */
export type PartieProposee = {
  numero: number;
  equipes: EquipeComposee[];
  /** Les rencontres pointent des INDEX dans `equipes` : les équipes de mêlée n'ont pas encore d'id. */
  rencontres: { terrain: number; indexA: number; indexB: number }[];
  indexExempt: number | null;
  /** Vrai seulement si deux ÉQUIPES déjà rencontrées doivent se réaffronter. */
  revancheForcee: boolean;
  /**
   * Mêlée : nombre de paires de joueurs qui se réaffrontent. Ce n'est pas une
   * anomalie — avec des équipes groupées par niveau, les vainqueurs se
   * retrouvent forcément entre eux. On le minimise et on l'affiche, on ne
   * l'interdit pas (au contraire des coéquipiers, eux jamais répétés).
   */
  repetitionsAdversaires: number;
};

export type ParametresTournoi = {
  format: FormatTournoi;
  tailleEquipe: number;
  nbParties: number;
  nbTerrains: number;
  pointsVictoire: number;
};

export type Stats = {
  id: number;
  joues: number;
  victoires: number;
  defaites: number;
  pointsPour: number;
  pointsContre: number;
  diff: number;
  exempts: number;
};

export type StatsClassees = Stats & { rang: number; exaequo: boolean };

type Alea = () => number;

// ---------------------------------------------------------------- scores

/**
 * Un score compte s'il est complet et que le vainqueur est au but. On tolère
 * un score au-dessus du but (parties en temps limité prolongées) mais pas deux
 * vainqueurs ni un match nul : le classement ne saurait pas les départager.
 */
export function scoreValide(
  r: { scoreA: number | null; scoreB: number | null },
  pointsVictoire: number,
): boolean {
  const { scoreA: a, scoreB: b } = r;
  if (a == null || b == null) return false;
  if (!Number.isInteger(a) || !Number.isInteger(b)) return false;
  if (a < 0 || b < 0) return false;
  if (a === b) return false;
  return Math.max(a, b) >= pointsVictoire;
}

// ------------------------------------------------------------ historique

export type Historique = {
  adversairesEquipe: Map<IdEquipe, Set<IdEquipe>>;
  terrainsEquipe: Map<IdEquipe, Map<number, number>>;
  coequipiers: Map<IdParticipant, Set<IdParticipant>>;
  adversairesParticipant: Map<IdParticipant, Set<IdParticipant>>;
  terrainsParticipant: Map<IdParticipant, Map<number, number>>;
  exemptsEquipe: Map<IdEquipe, number>;
  exemptsParticipant: Map<IdParticipant, number>;
};

function pousser<K, V>(m: Map<K, Set<V>>, k: K, v: V) {
  let s = m.get(k);
  if (!s) m.set(k, (s = new Set()));
  s.add(v);
}
function compter<K>(m: Map<K, Map<number, number>>, k: K, t: number) {
  let c = m.get(k);
  if (!c) m.set(k, (c = new Map()));
  c.set(t, (c.get(t) ?? 0) + 1);
}
function incr<K>(m: Map<K, number>, k: K) {
  m.set(k, (m.get(k) ?? 0) + 1);
}

/**
 * Reconstruit l'historique à partir des parties déjà composées. On enregistre
 * dès la COMPOSITION, pas seulement quand le score est saisi : sinon on
 * réapparierait deux équipes qui s'affrontent déjà mais n'ont pas fini.
 */
export function construireHistorique(parties: PartieJouee[]): Historique {
  const h: Historique = {
    adversairesEquipe: new Map(),
    terrainsEquipe: new Map(),
    coequipiers: new Map(),
    adversairesParticipant: new Map(),
    terrainsParticipant: new Map(),
    exemptsEquipe: new Map(),
    exemptsParticipant: new Map(),
  };

  for (const p of parties) {
    const parId = new Map(p.equipes.map((e) => [e.id, e]));

    for (const e of p.equipes) {
      for (let i = 0; i < e.membres.length; i++) {
        for (let j = i + 1; j < e.membres.length; j++) {
          pousser(h.coequipiers, e.membres[i], e.membres[j]);
          pousser(h.coequipiers, e.membres[j], e.membres[i]);
        }
      }
    }

    for (const r of p.rencontres) {
      pousser(h.adversairesEquipe, r.equipeA, r.equipeB);
      pousser(h.adversairesEquipe, r.equipeB, r.equipeA);
      compter(h.terrainsEquipe, r.equipeA, r.terrain);
      compter(h.terrainsEquipe, r.equipeB, r.terrain);

      const mA = parId.get(r.equipeA)?.membres ?? [];
      const mB = parId.get(r.equipeB)?.membres ?? [];
      for (const a of mA) {
        compter(h.terrainsParticipant, a, r.terrain);
        for (const b of mB) {
          pousser(h.adversairesParticipant, a, b);
          pousser(h.adversairesParticipant, b, a);
        }
      }
      for (const b of mB) compter(h.terrainsParticipant, b, r.terrain);
    }

    if (p.equipeExempteId != null) {
      incr(h.exemptsEquipe, p.equipeExempteId);
      for (const m of parId.get(p.equipeExempteId)?.membres ?? []) incr(h.exemptsParticipant, m);
    }
  }
  return h;
}

// ------------------------------------------------------------ statistiques

function statsVierges(id: number): Stats {
  return { id, joues: 0, victoires: 0, defaites: 0, pointsPour: 0, pointsContre: 0, diff: 0, exempts: 0 };
}

function enregistrer(s: Stats, pour: number, contre: number) {
  s.joues++;
  s.pointsPour += pour;
  s.pointsContre += contre;
  if (pour > contre) s.victoires++;
  else s.defaites++;
}

/** Une équipe exempte est créditée d'une victoire, sans point pour ni contre. */
function enregistrerExempt(s: Stats) {
  s.joues++;
  s.victoires++;
  s.exempts++;
}

export function statistiquesEquipes(parties: PartieJouee[], pointsVictoire: number): Stats[] {
  const par = new Map<IdEquipe, Stats>();
  const de = (id: IdEquipe) => {
    let s = par.get(id);
    if (!s) par.set(id, (s = statsVierges(id)));
    return s;
  };
  for (const p of parties) {
    for (const e of p.equipes) de(e.id);
    for (const r of p.rencontres) {
      if (!scoreValide(r, pointsVictoire)) continue;
      enregistrer(de(r.equipeA), r.scoreA!, r.scoreB!);
      enregistrer(de(r.equipeB), r.scoreB!, r.scoreA!);
    }
    if (p.equipeExempteId != null) enregistrerExempt(de(p.equipeExempteId));
  }
  for (const s of par.values()) s.diff = s.pointsPour - s.pointsContre;
  return [...par.values()];
}

/**
 * Classement individuel : chaque joueur hérite du résultat de l'équipe dans
 * laquelle il jouait ce tour-là. C'est ce qui rend la mêlée classable.
 */
export function statistiquesParticipants(
  parties: PartieJouee[],
  participants: IdParticipant[],
  pointsVictoire: number,
): Stats[] {
  const par = new Map<IdParticipant, Stats>(participants.map((id) => [id, statsVierges(id)]));
  const de = (id: IdParticipant) => {
    let s = par.get(id);
    if (!s) par.set(id, (s = statsVierges(id)));
    return s;
  };
  for (const p of parties) {
    const parId = new Map(p.equipes.map((e) => [e.id, e]));
    for (const r of p.rencontres) {
      if (!scoreValide(r, pointsVictoire)) continue;
      for (const m of parId.get(r.equipeA)?.membres ?? []) enregistrer(de(m), r.scoreA!, r.scoreB!);
      for (const m of parId.get(r.equipeB)?.membres ?? []) enregistrer(de(m), r.scoreB!, r.scoreA!);
    }
    if (p.equipeExempteId != null) {
      for (const m of parId.get(p.equipeExempteId)?.membres ?? []) enregistrerExempt(de(m));
    }
  }
  for (const s of par.values()) s.diff = s.pointsPour - s.pointsContre;
  return [...par.values()];
}

/** Victoires ↓, puis goal-average ↓, puis points marqués ↓. Même règle que la V1. */
export function comparerStats(a: Stats, b: Stats): number {
  return b.victoires - a.victoires || b.diff - a.diff || b.pointsPour - a.pointsPour || a.id - b.id;
}

export function classer(stats: Stats[]): StatsClassees[] {
  const tries = [...stats].sort(comparerStats);
  const out: StatsClassees[] = [];
  let rang = 0;
  for (let i = 0; i < tries.length; i++) {
    const s = tries[i];
    const p = out[i - 1];
    const memeRang =
      !!p && p.victoires === s.victoires && p.diff === s.diff && p.pointsPour === s.pointsPour;
    if (!memeRang) rang = i + 1;
    out.push({ ...s, rang, exaequo: memeRang });
  }
  // marque aussi la première équipe d'un groupe d'ex æquo
  for (let i = 0; i < out.length - 1; i++) if (out[i + 1].exaequo) out[i].exaequo = true;
  return out;
}

// -------------------------------------------------------------- terrains

/**
 * Répartit les rencontres sur les terrains en évitant qu'une équipe retombe
 * sur un terrain déjà occupé. Quand il y a plus de rencontres que de terrains,
 * plusieurs rencontres partagent un terrain : elles se jouent en deux vagues,
 * c'est à l'organisateur de les enchaîner.
 */
export function attribuerTerrains<T extends { terrain: number }>(
  rencontres: T[],
  cotesDe: (r: T) => IdEquipe[],
  membresDe: (r: T) => IdParticipant[],
  historique: Historique,
  nbTerrains: number,
): void {
  const usageTour = new Array(nbTerrains + 1).fill(0);

  const cout = (t: number, r: T) => {
    let c = 0;
    for (const e of cotesDe(r)) c += historique.terrainsEquipe.get(e)?.get(t) ?? 0;
    for (const m of membresDe(r)) c += historique.terrainsParticipant.get(m)?.get(t) ?? 0;
    return c;
  };

  // Cas courant (une rencontre par terrain) : on cherche l'affectation
  // optimale par séparation et évaluation plutôt que de se contenter d'un
  // glouton — c'est ce qui fait la différence entre ~1 et ~5 répétitions
  // de terrain sur un tournoi, et ça reste instantané à cette taille.
  if (rencontres.length <= nbTerrains) {
    let budget = 200000;
    const pris = new Array(nbTerrains + 1).fill(false);
    const courant = new Array(rencontres.length).fill(1);
    let meilleur: number[] | null = null;
    let meilleurCout = Infinity;

    const explorer = (i: number, cumul: number) => {
      if (budget-- <= 0) return;
      if (cumul >= meilleurCout) return; // élagage
      if (i === rencontres.length) {
        meilleurCout = cumul;
        meilleur = [...courant];
        return;
      }
      for (let t = 1; t <= nbTerrains; t++) {
        if (pris[t]) continue;
        pris[t] = true;
        courant[i] = t;
        explorer(i + 1, cumul + cout(t, rencontres[i]));
        pris[t] = false;
      }
    };
    explorer(0, 0);

    if (meilleur) {
      const choix = meilleur as number[];
      rencontres.forEach((r, i) => { r.terrain = choix[i]; });
      return;
    }
  }

  // 1) glouton : d'abord équilibrer le nombre de rencontres par terrain,
  //    puis minimiser les répétitions pour les équipes concernées
  for (const r of rencontres) {
    let meilleur = 1;
    let meilleureCle = Infinity;
    for (let t = 1; t <= nbTerrains; t++) {
      const cle = usageTour[t] * 10000 + cout(t, r);
      if (cle < meilleureCle) {
        meilleureCle = cle;
        meilleur = t;
      }
    }
    r.terrain = meilleur;
    usageTour[meilleur]++;
  }

  // 2) passe d'amélioration : échanger les terrains de deux rencontres si le
  //    total des répétitions baisse (l'échange préserve l'équilibrage)
  for (let passe = 0; passe < 4; passe++) {
    let bouge = false;
    for (let i = 0; i < rencontres.length; i++) {
      for (let j = i + 1; j < rencontres.length; j++) {
        const ri = rencontres[i];
        const rj = rencontres[j];
        if (ri.terrain === rj.terrain) continue;
        const avant = cout(ri.terrain, ri) + cout(rj.terrain, rj);
        const apres = cout(rj.terrain, ri) + cout(ri.terrain, rj);
        if (apres < avant) {
          const t = ri.terrain;
          ri.terrain = rj.terrain;
          rj.terrain = t;
          bouge = true;
        }
      }
    }
    if (!bouge) break;
  }
}

// ------------------------------------------------------- appariement suisse

/**
 * Cherche un appariement complet par retour arrière : on prend l'équipe la
 * mieux classée non appariée et on lui cherche l'adversaire le plus proche en
 * nombre de victoires qu'elle n'a pas déjà rencontré.
 */
function apparier(
  ordre: number[],
  victoiresDe: (id: number) => number,
  dejaJoue: (a: number, b: number) => boolean,
  interdireRevanche: boolean,
): [number, number][] | null {
  const solve = (reste: number[]): [number, number][] | null => {
    if (reste.length === 0) return [];
    if (reste.length === 1) return null;
    const a = reste[0];
    const autres = reste.slice(1);
    const candidats = autres
      .map((b, i) => ({ b, i, cout: Math.abs(victoiresDe(a) - victoiresDe(b)) }))
      .sort((x, y) => x.cout - y.cout || x.i - y.i);
    for (const c of candidats) {
      if (interdireRevanche && dejaJoue(a, c.b)) continue;
      const sous = autres.filter((x) => x !== c.b);
      const r = solve(sous);
      if (r) return [[a, c.b], ...r];
    }
    return null;
  };
  return solve(ordre);
}

/**
 * Calendrier « toutes rondes » par la méthode du cercle : chaque équipe
 * rencontre chaque autre exactement une fois en N−1 tours, zéro revanche
 * garantie. Un effectif impair fait tourner un exempt d'une ronde a l'autre.
 *
 * Utilisé quand on demande autant de parties que le permet l'effectif :
 * l'appariement suisse, qui n'optimise que le tour courant, se peint dans un
 * coin sur les derniers tours et finit par imposer des revanches.
 */
export function calendrierToutesRondes(ids: number[]): [number, number | null][][] {
  const liste: (number | null)[] = ids.length % 2 === 0 ? [...ids] : [...ids, null];
  const t = liste.length;
  const rondes: [number, number | null][][] = [];
  for (let r = 0; r < t - 1; r++) {
    const paires: [number, number | null][] = [];
    for (let i = 0; i < t / 2; i++) {
      const a = liste[i];
      const b = liste[t - 1 - i];
      if (a == null) paires.push([b as number, null]);
      else paires.push([a, b]);
    }
    rondes.push(paires);
    const fixe = liste[0];
    const reste = liste.slice(1);
    reste.unshift(reste.pop() as number | null);
    liste.length = 0;
    liste.push(fixe, ...reste);
  }
  return rondes;
}

/**
 * Appariement complet de coût minimal, par séparation et évaluation. Sert à la
 * mêlée, où l'on veut le moins possible d'adversaires déjà affrontés tout en
 * gardant des rencontres de niveau équilibré (l'ordre d'entrée fait foi).
 * Budget de nœuds borné : au pire on garde la meilleure solution trouvée.
 */
function apparierMinCout(
  indexes: number[],
  coutPaire: (a: number, b: number) => number,
): { paires: [number, number][] | null; cout: number } {
  let budget = 300000;
  let meilleur: [number, number][] | null = null;
  let meilleurCout = Infinity;
  const courant: [number, number][] = [];

  const explorer = (reste: number[], cumul: number) => {
    if (budget-- <= 0) return;
    if (cumul >= meilleurCout) return;
    if (reste.length === 0) {
      meilleurCout = cumul;
      meilleur = [...courant];
      return;
    }
    const a = reste[0];
    const autres = reste.slice(1);
    // on tente d'abord les adversaires de niveau voisin et de coût faible
    const candidats = autres
      .map((b, i) => ({ b, i, c: coutPaire(a, b) }))
      .sort((x, y) => x.c - y.c || x.i - y.i);
    for (const cand of candidats) {
      courant.push([a, cand.b]);
      explorer(autres.filter((x) => x !== cand.b), cumul + cand.c);
      courant.pop();
      if (meilleurCout === 0) return; // rien de mieux possible
    }
  };
  explorer(indexes, 0);
  return { paires: meilleur, cout: meilleurCout === Infinity ? 0 : meilleurCout };
}

/** Au-delà de N−1 parties, une revanche est mathématiquement inévitable. */
export function partiesMaxSansRevanche(nbEquipes: number): number {
  return Math.max(1, nbEquipes - 1);
}

function melanger<T>(a: T[], alea: Alea): T[] {
  const t = [...a];
  for (let i = t.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [t[i], t[j]] = [t[j], t[i]];
  }
  return t;
}

/** Choisit l'exempt : la moins bien classée qui ne l'a pas encore été. */
function choisirExempt(ordre: number[], exemptsDeja: Map<number, number>): number {
  for (let i = ordre.length - 1; i >= 0; i--) {
    if ((exemptsDeja.get(ordre[i]) ?? 0) === 0) return ordre[i];
  }
  return ordre[ordre.length - 1];
}

// ------------------------------------------------- composition : équipes fixes

export function composerPartieEquipesFixes(
  numero: number,
  equipes: { id: IdEquipe; numero: number; membres: IdParticipant[] }[],
  parties: PartieJouee[],
  params: ParametresTournoi,
  alea: Alea = Math.random,
): PartieProposee {
  const historique = construireHistorique(parties);
  const stats = new Map(
    statistiquesEquipes(parties, params.pointsVictoire).map((s) => [s.id, s]),
  );
  const victoiresDe = (id: number) => stats.get(id)?.victoires ?? 0;

  const composees0: EquipeComposee[] = equipes.map((e) => ({ id: e.id, numero: e.numero, membres: e.membres }));
  const indexDe0 = new Map(composees0.map((e, i) => [e.id!, i]));

  // Toutes rondes : dès qu'on demande N−1 parties ou plus, le suisse ne peut
  // plus tenir la promesse « pas de revanche ». Le calendrier du cercle, lui,
  // la tient par construction. L'ordre vient des numéros d'équipe : inutile de
  // tirer au sort, tout le monde rencontre tout le monde.
  if (params.nbParties >= equipes.length - 1 && numero <= equipes.length - 1) {
    const ordreIds = [...equipes].sort((a, b) => a.numero - b.numero).map((e) => e.id);
    const ronde = calendrierToutesRondes(ordreIds)[numero - 1];
    const rencontresTR: { terrain: number; indexA: number; indexB: number }[] = [];
    let exemptTR: number | null = null;
    for (const [a, b] of ronde) {
      if (b == null) exemptTR = indexDe0.get(a)!;
      else rencontresTR.push({ terrain: 1, indexA: indexDe0.get(a)!, indexB: indexDe0.get(b)! });
    }
    attribuerTerrains(
      rencontresTR,
      (r) => [composees0[r.indexA].id!, composees0[r.indexB].id!],
      (r) => [...composees0[r.indexA].membres, ...composees0[r.indexB].membres],
      historique,
      params.nbTerrains,
    );
    return {
      numero,
      equipes: composees0,
      rencontres: rencontresTR,
      indexExempt: exemptTR,
      revancheForcee: false,
      repetitionsAdversaires: 0,
    };
  }

  // 1re partie : tirage au sort intégral. Ensuite : ordre du classement.
  let ordre: number[];
  if (parties.length === 0) {
    ordre = melanger(equipes.map((e) => e.id), alea);
  } else {
    ordre = [...equipes]
      .map((e) => stats.get(e.id) ?? { ...statsVierges(e.id) })
      .sort(comparerStats)
      .map((s) => s.id);
  }

  let indexExempt: number | null = null;
  let exemptId: IdEquipe | null = null;
  if (ordre.length % 2 === 1) {
    exemptId = choisirExempt(ordre, historique.exemptsEquipe);
    ordre = ordre.filter((id) => id !== exemptId);
  }

  const dejaJoue = (a: number, b: number) => historique.adversairesEquipe.get(a)?.has(b) ?? false;
  let paires = apparier(ordre, victoiresDe, dejaJoue, true);
  let revancheForcee = false;
  if (!paires) {
    paires = apparier(ordre, victoiresDe, dejaJoue, false);
    revancheForcee = true;
  }
  if (!paires) throw new Error('Impossible de composer les rencontres de cette partie.');

  const composees = composees0;
  const indexDe = indexDe0;
  if (exemptId != null) indexExempt = indexDe.get(exemptId) ?? null;

  const rencontres = paires.map(([a, b]) => ({
    terrain: 1,
    indexA: indexDe.get(a)!,
    indexB: indexDe.get(b)!,
  }));

  attribuerTerrains(
    rencontres,
    (r) => [composees[r.indexA].id!, composees[r.indexB].id!],
    (r) => [...composees[r.indexA].membres, ...composees[r.indexB].membres],
    historique,
    params.nbTerrains,
  );

  return { numero, equipes: composees, rencontres, indexExempt, revancheForcee, repetitionsAdversaires: 0 };
}

// ------------------------------------------------------- composition : mêlée

/**
 * Découpe un effectif en équipes de taille `taille`, en tolérant des équipes
 * plus petites d'un joueur plutôt que de laisser quelqu'un sur le banc : avec
 * 14 joueurs en triplettes on sort 4 triplettes + 1 doublette, comme le ferait
 * un organisateur. Jamais d'équipe plus grande que demandé.
 */
export function repartirEffectif(nbJoueurs: number, taille: number): number[] {
  if (nbJoueurs < taille) return nbJoueurs > 0 ? [nbJoueurs] : [];
  const nbEquipes = Math.ceil(nbJoueurs / taille);
  const base = Math.floor(nbJoueurs / nbEquipes);
  const reste = nbJoueurs % nbEquipes;
  const tailles: number[] = [];
  for (let i = 0; i < nbEquipes; i++) tailles.push(i < reste ? base + 1 : base);
  return tailles;
}

function paires<T>(xs: T[]): [T, T][] {
  const out: [T, T][] = [];
  for (let i = 0; i < xs.length; i++) for (let j = i + 1; j < xs.length; j++) out.push([xs[i], xs[j]]);
  return out;
}

/**
 * Forme les équipes de mêlée. On regroupe d'abord les joueurs de même niveau
 * (le classement est individuel : les 2 victoires doivent se retrouver
 * ensemble), puis une recherche locale échange des joueurs de niveau voisin
 * pour éviter de refaire les mêmes équipes qu'aux tours précédents.
 */
function composerEquipesMelee(
  ordre: IdParticipant[],
  tailles: number[],
  historique: Historique,
  alea: Alea,
): IdParticipant[][] {
  const rangDe = new Map(ordre.map((id, i) => [id, i]));

  const equipes: IdParticipant[][] = [];
  let k = 0;
  for (const t of tailles) {
    equipes.push(ordre.slice(k, k + t));
    k += t;
  }

  const penalite = (eq: IdParticipant[]) => {
    let p = 0;
    for (const [a, b] of paires(eq)) if (historique.coequipiers.get(a)?.has(b)) p += 100;
    const rangs = eq.map((id) => rangDe.get(id)!);
    p += Math.max(...rangs) - Math.min(...rangs); // garde les équipes homogènes
    return p;
  };

  let total = equipes.reduce((s, e) => s + penalite(e), 0);
  const maxIter = 400 * equipes.length;
  for (let it = 0; it < maxIter && total > 0; it++) {
    const i = Math.floor(alea() * equipes.length);
    const j = Math.floor(alea() * equipes.length);
    if (i === j) continue;
    const a = Math.floor(alea() * equipes[i].length);
    const b = Math.floor(alea() * equipes[j].length);
    const avant = penalite(equipes[i]) + penalite(equipes[j]);
    [equipes[i][a], equipes[j][b]] = [equipes[j][b], equipes[i][a]];
    const apres = penalite(equipes[i]) + penalite(equipes[j]);
    if (apres <= avant) {
      total += apres - avant;
    } else {
      [equipes[i][a], equipes[j][b]] = [equipes[j][b], equipes[i][a]]; // on annule
    }
  }
  return equipes;
}

export function composerPartieMelee(
  numero: number,
  participants: IdParticipant[],
  parties: PartieJouee[],
  params: ParametresTournoi,
  alea: Alea = Math.random,
): PartieProposee {
  const historique = construireHistorique(parties);
  const stats = new Map(
    statistiquesParticipants(parties, participants, params.pointsVictoire).map((s) => [s.id, s]),
  );

  const ordre =
    parties.length === 0
      ? melanger(participants, alea)
      : [...participants]
          .map((id) => stats.get(id) ?? statsVierges(id))
          .sort(comparerStats)
          .map((s) => s.id);

  const tailles = repartirEffectif(ordre.length, params.tailleEquipe);
  const equipesMembres = composerEquipesMelee(ordre, tailles, historique, alea);

  const composees: EquipeComposee[] = equipesMembres.map((membres, i) => ({
    id: null,
    numero: i + 1,
    membres,
  }));

  // Les équipes sont numérotées du meilleur au moins bon : leur index tient
  // lieu de classement pour l'appariement.
  let indexes = composees.map((_, i) => i);
  let indexExempt: number | null = null;
  if (indexes.length % 2 === 1) {
    // en mêlée, aucune équipe n'a d'historique d'exempt : on repose la dernière
    indexExempt = indexes[indexes.length - 1];
    indexes = indexes.slice(0, -1);
  }

  // Deux équipes de mêlée ne se sont jamais rencontrées (elles viennent d'être
  // créées) : c'est au niveau des JOUEURS que la question se pose. Et là,
  // l'interdire serait absurde : en groupant par niveau, ceux qui gagnent se
  // retrouvent nécessairement face aux mêmes. On minimise, on n'interdit pas.
  const coutPaire = (i: number, j: number) => {
    let c = 0;
    for (const a of composees[i].membres) {
      for (const b of composees[j].membres) {
        if (historique.adversairesParticipant.get(a)?.has(b)) c++;
      }
    }
    return c;
  };

  const { paires: paires2, cout: repetitionsAdversaires } = apparierMinCout(indexes, coutPaire);
  if (!paires2) throw new Error('Impossible de composer les rencontres de cette partie.');
  const revancheForcee = false;

  const rencontres = paires2.map(([a, b]) => ({ terrain: 1, indexA: a, indexB: b }));

  attribuerTerrains(
    rencontres,
    () => [],
    (r) => [...composees[r.indexA].membres, ...composees[r.indexB].membres],
    historique,
    params.nbTerrains,
  );

  return { numero, equipes: composees, rencontres, indexExempt, revancheForcee, repetitionsAdversaires };
}

// -------------------------------------------------------------- façade

export function composerProchainePartie(
  numero: number,
  params: ParametresTournoi,
  equipesPermanentes: { id: IdEquipe; numero: number; membres: IdParticipant[] }[],
  participants: IdParticipant[],
  parties: PartieJouee[],
  alea: Alea = Math.random,
): PartieProposee {
  return params.format === 'equipes_fixes'
    ? composerPartieEquipesFixes(numero, equipesPermanentes, parties, params, alea)
    : composerPartieMelee(numero, participants, parties, params, alea);
}
