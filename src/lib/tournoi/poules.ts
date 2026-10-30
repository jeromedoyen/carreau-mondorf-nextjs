/**
 * Moteur du format « poules » — répartition, calendrier de poule, classement,
 * qualification, tableaux à élimination directe.
 *
 * Comme `moteur.ts`, il est volontairement sans Supabase, sans React et sans
 * effet de bord : tout entre par les paramètres et ressort par la valeur de
 * retour. C'est ce qui permet de le simuler sur des milliers de concours
 * (`scripts/verifier-poules.ts`) avant de le brancher.
 *
 * Déroulé d'un concours à poules (une « partie » = un tour joué par tout le monde) :
 *
 *   1. les équipes (fixes) sont réparties en poules de 3 à 5, en évitant que
 *      deux équipes du même club se retrouvent dans la même poule ;
 *   2. chaque poule se joue en tours successifs, soit « à repêchage » (poule de 4,
 *      2 qualifiés), soit « toutes rondes » (chacun rencontre chacun) ;
 *   3. les qualifiés jouent un TABLEAU PRINCIPAL à élimination directe ; les
 *      éliminés des poules, s'il y a une consolante, jouent la CONSOLANTE ;
 *   4. les deux tableaux avancent ensemble, un tour par partie.
 *
 * Rien n'est stocké d'avance : chaque partie se déduit des résultats déjà
 * saisis, comme pour le système suisse. Seules les positions des tableaux sont
 * figées au moment de la qualification (`PlaceTableau`) : elles dépendent des
 * résultats de poule, qu'une correction ultérieure ne doit pas redistribuer.
 */

import { attribuerTerrains, calendrierToutesRondes, construireHistorique, scoreValide, type PartieJouee } from './moteur';

export type ModePoule = 'repechage' | 'toutes_rondes';
export type Tableau = 'principal' | 'consolante';
type Alea = () => number;

export type EquipePoules = { id: number; numero: number; club: string | null };

export type ParametresPoules = {
  mode: ModePoule;
  /** Taille de poule visée (3 à 5) ; les poules sont équilibrées autour d'elle. */
  taillePoule: number;
  /** Qualifiés par poule en « toutes rondes » (1 à 3). Toujours 2 à repêchage. */
  qualifies: number;
  consolante: boolean;
  pointsVictoire: number;
  nbTerrains: number;
};

export type PouleDef = { id: number; numero: number; equipes: number[] };

export type RencontrePoules = {
  partieNumero: number;
  phase: 'poule' | Tableau;
  pouleId: number | null;
  /** Tour de poule (1..) ou tour de tableau (1 = premier tour). */
  tour: number;
  /** Position dans le tour du tableau (1..) ; null en poule. */
  place: number | null;
  terrain: number;
  equipeA: number;
  equipeB: number;
  scoreA: number | null;
  scoreB: number | null;
};

/** Case d'un tableau : `equipeId` null = exempt (l'adversaire passe directement). */
export type PlaceTableau = { tableau: Tableau; position: number; equipeId: number | null };

export function nomPoule(numero: number): string {
  return String.fromCharCode(64 + numero);
}

// ------------------------------------------------------ répartition en poules

/**
 * Tailles de poules pour `nbEquipes` équipes. Les poules sont équilibrées
 * (elles diffèrent d'une équipe au plus), jamais plus petites que 3. À
 * repêchage elles ne dépassent pas 4 : au-delà, la formule n'existe pas.
 */
export function repartitionPoules(
  nbEquipes: number,
  cible: number,
  mode: ModePoule,
): { tailles: number[] } | { erreur: string } {
  if (nbEquipes < 3) return { erreur: 'Il faut au moins 3 équipes pour former une poule.' };
  const maxTaille = mode === 'repechage' ? 4 : 5;
  const c = Math.min(Math.max(Math.round(cible), 3), maxTaille);
  let nb = Math.max(Math.ceil(nbEquipes / c), Math.ceil(nbEquipes / maxTaille));
  while (nb > 1 && Math.floor(nbEquipes / nb) < 3) nb--;
  const mini = Math.floor(nbEquipes / nb);
  const maxi = Math.ceil(nbEquipes / nb);
  if (mini < 3 || maxi > maxTaille) {
    return {
      erreur:
        mode === 'repechage'
          ? `Avec ${nbEquipes} équipes, les poules à repêchage (3 ou 4 équipes) ne sont pas possibles : choisissez « toutes rondes ».`
          : `Avec ${nbEquipes} équipes, on ne peut pas former de poules de 3 à ${maxTaille} équipes.`,
    };
  }
  const base = Math.floor(nbEquipes / nb);
  const reste = nbEquipes % nb;
  return { tailles: Array.from({ length: nb }, (_, i) => base + (i < reste ? 1 : 0)) };
}

function cleClub(club: string | null): string | null {
  const c = club?.trim().toLowerCase();
  return c ? c : null;
}

function melanger<T>(liste: T[], alea: Alea): T[] {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(alea() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tire les poules au sort en évitant que deux équipes du même club se
 * retrouvent ensemble. On place d'abord les clubs les plus représentés, chaque
 * équipe dans la poule qui compte le moins de ses clubmates, et on recommence
 * plusieurs fois au hasard pour garder le meilleur tirage. `conflitsClub`
 * compte les paires de même club qu'on n'a pas pu séparer (un club qui aurait
 * plus d'équipes que de poules, par exemple).
 */
export function tirerPoules(
  equipes: EquipePoules[],
  tailles: number[],
  alea: Alea,
): { poules: number[][]; conflitsClub: number } {
  let meilleur: number[][] | null = null;
  let meilleursConflits = Infinity;

  for (let essai = 0; essai < 300 && meilleursConflits > 0; essai++) {
    const parClub = new Map<string, EquipePoules[]>();
    const sansClub: EquipePoules[] = [];
    for (const e of melanger(equipes, alea)) {
      const k = cleClub(e.club);
      if (!k) sansClub.push(e);
      else parClub.set(k, [...(parClub.get(k) ?? []), e]);
    }
    const ordre = [
      ...melanger([...parClub.values()], alea).sort((a, b) => b.length - a.length).flat(),
      ...sansClub,
    ];

    const poules: number[][] = tailles.map(() => []);
    const compte: Map<string, number>[] = tailles.map(() => new Map());
    for (const e of ordre) {
      const k = cleClub(e.club);
      let choisie = -1;
      let coutChoisi = Infinity;
      let departage = 0;
      for (let p = 0; p < tailles.length; p++) {
        if (poules[p].length >= tailles[p]) continue;
        const cout = k ? (compte[p].get(k) ?? 0) : 0;
        const remplissage = poules[p].length / tailles[p];
        const score = cout * 1000 + remplissage;
        const hasard = alea();
        if (score < coutChoisi || (score === coutChoisi && hasard > departage)) {
          choisie = p;
          coutChoisi = score;
          departage = hasard;
        }
      }
      poules[choisie].push(e.id);
      if (k) compte[choisie].set(k, (compte[choisie].get(k) ?? 0) + 1);
    }

    let conflits = 0;
    for (const m of compte) for (const n of m.values()) conflits += (n * (n - 1)) / 2;
    if (conflits < meilleursConflits) {
      meilleursConflits = conflits;
      meilleur = poules;
    }
  }
  return { poules: meilleur ?? tailles.map(() => []), conflitsClub: meilleursConflits === Infinity ? 0 : meilleursConflits };
}

// ------------------------------------------------------------ jeu d'une poule

type RencontrePoule = Pick<RencontrePoules, 'tour' | 'equipeA' | 'equipeB' | 'scoreA' | 'scoreB'>;

/** Nombre de tours qu'il faut pour jouer une poule. */
export function nbToursPoule(mode: ModePoule, taille: number): number {
  if (mode === 'repechage' && taille === 4) return 3;
  return taille % 2 === 0 ? taille - 1 : taille;
}

function resultatEntre(
  rencontres: RencontrePoule[],
  a: number,
  b: number,
  but: number,
): { gagnant: number; perdant: number } | null {
  const r = rencontres.find((x) => (x.equipeA === a && x.equipeB === b) || (x.equipeA === b && x.equipeB === a));
  if (!r || !scoreValide(r, but)) return null;
  return r.scoreA! > r.scoreB!
    ? { gagnant: r.equipeA, perdant: r.equipeB }
    : { gagnant: r.equipeB, perdant: r.equipeA };
}

/**
 * Paires du tour `tour` d'une poule.
 *
 * À repêchage (poule de 4) : tour 1 = 1-2 et 3-4 ; tour 2 = gagnants entre eux
 * et perdants entre eux ; tour 3 = le perdant du match des gagnants contre le
 * gagnant du match des perdants (barrage pour la 2ᵉ place qualificative).
 * Sinon : calendrier toutes rondes (méthode du cercle).
 */
export function rencontresDuTour(
  mode: ModePoule,
  ids: number[],
  tour: number,
  dejaJouees: RencontrePoule[],
  but: number,
): [number, number][] {
  if (mode === 'repechage' && ids.length === 4) {
    const [a, b, c, d] = ids;
    if (tour === 1) return [[a, b], [c, d]];
    const r1 = resultatEntre(dejaJouees, a, b, but);
    const r2 = resultatEntre(dejaJouees, c, d, but);
    if (!r1 || !r2) throw new Error('Résultats du tour 1 manquants dans une poule.');
    if (tour === 2) return [[r1.gagnant, r2.gagnant], [r1.perdant, r2.perdant]];
    if (tour === 3) {
      const gg = resultatEntre(dejaJouees, r1.gagnant, r2.gagnant, but);
      const pp = resultatEntre(dejaJouees, r1.perdant, r2.perdant, but);
      if (!gg || !pp) throw new Error('Résultats du tour 2 manquants dans une poule.');
      return [[gg.perdant, pp.gagnant]];
    }
    return [];
  }
  const ronde = calendrierToutesRondes(ids)[tour - 1];
  if (!ronde) return [];
  return ronde.filter((p): p is [number, number] => p[1] != null);
}

export type LignePoule = {
  id: number;
  rang: number;
  joues: number;
  victoires: number;
  pointsPour: number;
  pointsContre: number;
  diff: number;
  ordreTirage: number;
  /** Égalité que ni la confrontation directe ni le goal-average ne tranchent : départagée au rang du tirage. */
  exaequo: boolean;
};

export type ClassementPoule = { lignes: LignePoule[]; complet: boolean };

/**
 * Classement d'une poule.
 *
 * À repêchage, une fois la poule jouée, le rang se lit directement sur
 * l'arbre : 1er = vainqueur du match des gagnants, 2ᵉ = vainqueur du barrage,
 * 3ᵉ = perdant du barrage, 4ᵉ = perdant du match des perdants.
 *
 * Sinon (et en cours de poule) : victoires ; puis, entre deux équipes à égalité,
 * la confrontation directe ; sinon goal-average de la poule, puis points marqués ;
 * en dernier recours le rang du tirage, avec `exaequo` pour le dire.
 */
export function classerPoule(
  mode: ModePoule,
  ids: number[],
  rencontres: RencontrePoule[],
  but: number,
): ClassementPoule {
  const lignes = new Map<number, LignePoule>(
    ids.map((id, i) => [
      id,
      { id, rang: 0, joues: 0, victoires: 0, pointsPour: 0, pointsContre: 0, diff: 0, ordreTirage: i, exaequo: false },
    ]),
  );
  let valides = 0;
  for (const r of rencontres) {
    if (!lignes.has(r.equipeA) || !lignes.has(r.equipeB) || !scoreValide(r, but)) continue;
    valides++;
    const a = lignes.get(r.equipeA)!;
    const b = lignes.get(r.equipeB)!;
    a.joues++; b.joues++;
    a.pointsPour += r.scoreA!; a.pointsContre += r.scoreB!;
    b.pointsPour += r.scoreB!; b.pointsContre += r.scoreA!;
    if (r.scoreA! > r.scoreB!) a.victoires++; else b.victoires++;
  }
  for (const l of lignes.values()) l.diff = l.pointsPour - l.pointsContre;

  const attendues = mode === 'repechage' && ids.length === 4 ? 5 : (ids.length * (ids.length - 1)) / 2;
  const complet = valides === attendues;

  if (mode === 'repechage' && ids.length === 4 && complet) {
    const [a, b, c, d] = ids;
    const r1 = resultatEntre(rencontres, a, b, but)!;
    const r2 = resultatEntre(rencontres, c, d, but)!;
    const gg = resultatEntre(rencontres, r1.gagnant, r2.gagnant, but);
    const pp = resultatEntre(rencontres, r1.perdant, r2.perdant, but);
    const bar = gg && pp ? resultatEntre(rencontres, gg.perdant, pp.gagnant, but) : null;
    if (gg && pp && bar) {
      const ordre = [gg.gagnant, bar.gagnant, bar.perdant, pp.perdant];
      ordre.forEach((id, i) => (lignes.get(id)!.rang = i + 1));
      return { lignes: ordre.map((id) => lignes.get(id)!), complet };
    }
  }

  const tries = [...lignes.values()].sort((x, y) => y.victoires - x.victoires || x.ordreTirage - y.ordreTirage);
  const ordonnees: LignePoule[] = [];
  for (let i = 0; i < tries.length; ) {
    let j = i;
    while (j < tries.length && tries[j].victoires === tries[i].victoires) j++;
    const groupe = tries.slice(i, j);
    if (groupe.length === 2) {
      const h2h = resultatEntre(rencontres, groupe[0].id, groupe[1].id, but);
      if (h2h) {
        groupe.sort((x, y) => (x.id === h2h.gagnant ? -1 : y.id === h2h.gagnant ? 1 : 0));
        ordonnees.push(...groupe);
        i = j;
        continue;
      }
    }
    groupe.sort((x, y) => y.diff - x.diff || y.pointsPour - x.pointsPour || x.ordreTirage - y.ordreTirage);
    for (let k = 0; k < groupe.length - 1; k++) {
      if (groupe[k].diff === groupe[k + 1].diff && groupe[k].pointsPour === groupe[k + 1].pointsPour) {
        groupe[k].exaequo = true;
        groupe[k + 1].exaequo = true;
      }
    }
    ordonnees.push(...groupe);
    i = j;
  }
  ordonnees.forEach((l, i) => (l.rang = i + 1));
  return { lignes: ordonnees, complet };
}

// ---------------------------------------------------------------- tableaux

/** Ordre standard d'un tableau de `taille` cases : 1-8, 4-5, 2-7, 3-6… (les têtes de série se retrouvent tard). */
function ordreStandard(taille: number): number[] {
  let ordre = [1];
  while (ordre.length < taille) {
    const n = ordre.length * 2;
    ordre = ordre.flatMap((x) => [x, n + 1 - x]);
  }
  return ordre;
}

export function nbToursTableau(nbEquipes: number): number {
  return nbEquipes < 2 ? 0 : Math.ceil(Math.log2(nbEquipes));
}

/** « Finale », « Demi-finales »… à partir du nombre de tours du tableau et du tour courant. */
export function nomDuTour(nbTours: number, tour: number): string {
  switch (nbTours - tour) {
    case 0: return 'Finale';
    case 1: return 'Demi-finales';
    case 2: return 'Quarts de finale';
    case 3: return 'Huitièmes de finale';
    default: return `Tour ${tour}`;
  }
}

/**
 * Positions d'un tableau, à partir des équipes classées de la meilleure à la
 * moins bonne. Un nombre d'équipes qui n'est pas une puissance de 2 donne des
 * exempts (`null`) aux meilleures têtes de série. Au premier tour, on évite
 * qu'une équipe retrouve celle de sa poule (priorité), puis du même club, en
 * permutant des équipes de même rang de poule (`tier`) : un 2ᵉ de poule en
 * vaut un autre, on peut donc les échanger sans fausser le tableau.
 */
export function placerTableau(
  tetes: { id: number; poule: number; club: string | null; tier: number }[],
): (number | null)[] {
  const n = tetes.length;
  let taille = 1;
  while (taille < n) taille *= 2;
  const ordre = ordreStandard(Math.max(taille, 2));
  const positions: (number | null)[] = ordre.map((seed) => (seed <= n ? tetes[seed - 1].id : null));
  const infos = new Map(tetes.map((t) => [t.id, t]));

  const conflits = () => {
    let c = 0;
    for (let i = 0; i + 1 < positions.length; i += 2) {
      const a = positions[i];
      const b = positions[i + 1];
      if (a == null || b == null) continue;
      const ia = infos.get(a)!;
      const ib = infos.get(b)!;
      if (ia.poule === ib.poule) c += 100;
      const ka = cleClub(ia.club);
      if (ka && ka === cleClub(ib.club)) c += 1;
    }
    return c;
  };

  const occupees: number[] = [];
  positions.forEach((p, i) => {
    if (p != null) occupees.push(i);
  });
  let ameliore = true;
  for (let passe = 0; ameliore && passe < 100; passe++) {
    ameliore = false;
    for (let x = 0; x < occupees.length; x++) {
      for (let y = x + 1; y < occupees.length; y++) {
        const px = positions[occupees[x]] as number;
        const py = positions[occupees[y]] as number;
        if (infos.get(px)!.tier !== infos.get(py)!.tier) continue;
        const avant = conflits();
        positions[occupees[x]] = py;
        positions[occupees[y]] = px;
        if (conflits() < avant) ameliore = true;
        else {
          positions[occupees[x]] = px;
          positions[occupees[y]] = py;
        }
      }
    }
  }
  return positions;
}

type RencontreTableau = Pick<RencontrePoules, 'tour' | 'place' | 'equipeA' | 'equipeB' | 'scoreA' | 'scoreB'>;

function gagnantDe(r: RencontreTableau | undefined, but: number): number | null {
  if (!r || !scoreValide(r, but)) return null;
  return r.scoreA! > r.scoreB! ? r.equipeA : r.equipeB;
}

/**
 * Qui occupe chaque case de chaque tour : `participants(tour)[p-1]` = les deux
 * équipes (ou null si pas encore connues) de la rencontre p du tour `tour`, et
 * `vainqueurs(tour)[p-1]` = celle qui passe. Le premier tour tient compte des exempts.
 */
export function etatTableau(places: (number | null)[], rencontres: RencontreTableau[], but: number) {
  const taille = places.length;
  const nbTours = Math.log2(taille);
  const rencontre = (tour: number, place: number) => rencontres.find((r) => r.tour === tour && r.place === place);

  const vainqueursCache = new Map<number, (number | null)[]>();
  const participantsCache = new Map<number, [number | null, number | null][]>();

  const participants = (tour: number): [number | null, number | null][] => {
    const memo = participantsCache.get(tour);
    if (memo) return memo;
    const res: [number | null, number | null][] = [];
    const n = taille / 2 ** tour;
    for (let p = 1; p <= n; p++) {
      if (tour === 1) res.push([places[2 * p - 2], places[2 * p - 1]]);
      else {
        const v = vainqueurs(tour - 1);
        res.push([v[2 * p - 2], v[2 * p - 1]]);
      }
    }
    participantsCache.set(tour, res);
    return res;
  };

  const vainqueurs = (tour: number): (number | null)[] => {
    const memo = vainqueursCache.get(tour);
    if (memo) return memo;
    const v = participants(tour).map(([a, b], i) => {
      if (tour === 1 && (a == null || b == null)) return a ?? b; // exempt
      if (a == null || b == null) return null;
      return gagnantDe(rencontre(tour, i + 1), but);
    });
    vainqueursCache.set(tour, v);
    return v;
  };

  return { taille, nbTours, participants, vainqueurs };
}

/** Rencontres à créer au prochain tour d'un tableau (celles dont les deux équipes sont connues et qui n'existent pas encore). */
export function prochainesRencontresTableau(
  places: (number | null)[],
  rencontres: RencontreTableau[],
  but: number,
): { tour: number; place: number; equipeA: number; equipeB: number }[] {
  if (places.length < 2) return [];
  const e = etatTableau(places, rencontres, but);
  for (let tour = 1; tour <= e.nbTours; tour++) {
    const candidates = e
      .participants(tour)
      .map(([a, b], i) => ({ tour, place: i + 1, a, b }))
      .filter(
        (c) =>
          c.a != null &&
          c.b != null &&
          !rencontres.some((r) => r.tour === c.tour && r.place === c.place),
      )
      .map((c) => ({ tour: c.tour, place: c.place, equipeA: c.a as number, equipeB: c.b as number }));
    if (candidates.length) return candidates;
  }
  return [];
}

export function tableauTermine(places: (number | null)[], rencontres: RencontreTableau[], but: number): boolean {
  if (places.length < 2) return true;
  const e = etatTableau(places, rencontres, but);
  return e.vainqueurs(e.nbTours)[0] != null;
}

/** Classement d'un tableau : 1ᵉʳ, 2ᵉ, 3ᵉ (demi-finalistes à égalité), 5ᵉ (quarts)… `null` tant qu'une équipe est encore en lice. */
export function classementTableau(
  places: (number | null)[],
  rencontres: RencontreTableau[],
  but: number,
): { id: number; rang: number | null; tourElimination: number | null }[] {
  const equipes = places.filter((x): x is number => x != null);
  if (places.length < 2) return equipes.map((id) => ({ id, rang: null, tourElimination: null }));
  const e = etatTableau(places, rencontres, but);
  const champion = e.vainqueurs(e.nbTours)[0];
  const res = equipes.map((id) => {
    if (id === champion) return { id, rang: 1, tourElimination: null as number | null };
    for (let tour = 1; tour <= e.nbTours; tour++) {
      const v = e.vainqueurs(tour);
      const joue = e.participants(tour).findIndex(([a, b]) => a === id || b === id);
      if (joue < 0) continue;
      const w = v[joue];
      if (w != null && w !== id) return { id, rang: 2 ** (e.nbTours - tour) + 1, tourElimination: tour };
    }
    return { id, rang: null as number | null, tourElimination: null as number | null };
  });
  return res.sort((a, b) => (a.rang ?? 999) - (b.rang ?? 999));
}

// --------------------------------------------------------------- la partie suivante

export type PropositionPoules = {
  phase: 'poules' | 'tableaux';
  libelle: string;
  rencontres: {
    pouleId: number | null;
    tableau: Tableau | null;
    tour: number;
    place: number | null;
    equipeA: number;
    equipeB: number;
    terrain: number;
  }[];
  /** Positions à enregistrer : non vide seulement pour la toute première partie de tableaux. */
  nouvellesPlaces: PlaceTableau[];
  avertissements: string[];
};

export type ContextePoules = {
  params: ParametresPoules;
  equipes: EquipePoules[];
  poules: PouleDef[];
  rencontres: RencontrePoules[];
  places: PlaceTableau[];
};

export function qualifiesParPoule(params: ParametresPoules, taillePoule: number): number {
  const voulus = params.mode === 'repechage' ? 2 : params.qualifies;
  return Math.max(1, Math.min(voulus, taillePoule - 1));
}

function placesDuTableau(places: PlaceTableau[], tableau: Tableau): (number | null)[] {
  return places
    .filter((p) => p.tableau === tableau)
    .sort((a, b) => a.position - b.position)
    .map((p) => p.equipeId);
}

/**
 * Qui est qualifié, qui est éliminé, et dans quel ordre de tête de série.
 * Renvoie aussi les égalités parfaites tombées sur la frontière de qualification.
 */
export function qualification(ctx: ContextePoules) {
  const { params, poules, rencontres, equipes } = ctx;
  const club = new Map(equipes.map((e) => [e.id, e.club]));
  const infos: {
    id: number; poule: number; pouleNumero: number; club: string | null; rangPoule: number;
    ratio: number; diffMoyen: number; pointsMoyen: number; qualifie: boolean;
  }[] = [];
  const avertissements: string[] = [];

  for (const poule of poules) {
    const cl = classerPoule(
      params.mode,
      poule.equipes,
      rencontres.filter((r) => r.phase === 'poule' && r.pouleId === poule.id),
      params.pointsVictoire,
    );
    const k = qualifiesParPoule(params, poule.equipes.length);
    cl.lignes.forEach((l, i) => {
      infos.push({
        id: l.id,
        poule: poule.id,
        pouleNumero: poule.numero,
        club: club.get(l.id) ?? null,
        rangPoule: l.rang,
        ratio: l.joues ? l.victoires / l.joues : 0,
        diffMoyen: l.joues ? l.diff / l.joues : 0,
        pointsMoyen: l.joues ? l.pointsPour / l.joues : 0,
        qualifie: l.rang <= k,
      });
      const suivante = cl.lignes[i + 1];
      if (l.rang === k && suivante && l.exaequo && suivante.exaequo) {
        avertissements.push(
          `Poule ${nomPoule(poule.numero)} : égalité parfaite pour la place n°${k} (même nombre de victoires, même goal-average, mêmes points marqués) — départagée au rang du tirage.`,
        );
      }
    });
  }
  const ordre = (a: (typeof infos)[number], b: (typeof infos)[number]) =>
    a.rangPoule - b.rangPoule || b.ratio - a.ratio || b.diffMoyen - a.diffMoyen || b.pointsMoyen - a.pointsMoyen || a.pouleNumero - b.pouleNumero;
  return {
    principal: infos.filter((i) => i.qualifie).sort(ordre),
    consolante: infos.filter((i) => !i.qualifie).sort(ordre),
    avertissements,
  };
}

export type SuiteConcours =
  | { fini: true; raison: string }
  | { fini: false; proposition: PropositionPoules };

/**
 * Compose la partie `numeroPartie`. Précondition (vérifiée par l'appelant) :
 * la partie précédente est entièrement saisie.
 */
export function composerPartiePoules(ctx: ContextePoules): SuiteConcours {
  const { params, poules, rencontres } = ctx;
  const but = params.pointsVictoire;
  if (!poules.length) throw new Error("Tirez d'abord les poules.");

  const toursFaits = Math.max(0, ...rencontres.filter((r) => r.phase === 'poule').map((r) => r.tour));
  const toursTotal = Math.max(...poules.map((p) => nbToursPoule(params.mode, p.equipes.length)));

  const historique = construireHistorique(
    [...new Set(rencontres.map((r) => r.partieNumero))].map(
      (n): PartieJouee => ({
        numero: n,
        equipes: [],
        equipeExempteId: null,
        rencontres: rencontres
          .filter((r) => r.partieNumero === n)
          .map((r) => ({ terrain: r.terrain, equipeA: r.equipeA, equipeB: r.equipeB, scoreA: r.scoreA, scoreB: r.scoreB })),
      }),
    ),
  );
  const attribuer = (lignes: PropositionPoules['rencontres']) => {
    attribuerTerrains(lignes, (r) => [r.equipeA, r.equipeB], () => [], historique, params.nbTerrains);
  };

  // ------------------------------------------------------- les poules
  if (toursFaits < toursTotal) {
    const tour = toursFaits + 1;
    const lignes: PropositionPoules['rencontres'] = [];
    for (const poule of poules) {
      const paires = rencontresDuTour(
        params.mode,
        poule.equipes,
        tour,
        rencontres.filter((r) => r.phase === 'poule' && r.pouleId === poule.id),
        but,
      );
      for (const [a, b] of paires) {
        lignes.push({ pouleId: poule.id, tableau: null, tour, place: null, equipeA: a, equipeB: b, terrain: 1 });
      }
    }
    if (!lignes.length) throw new Error(`Aucune rencontre à jouer au tour ${tour} des poules.`);
    attribuer(lignes);
    return {
      fini: false,
      proposition: {
        phase: 'poules',
        libelle: `Poules — tour ${tour} sur ${toursTotal}`,
        rencontres: lignes,
        nouvellesPlaces: [],
        avertissements: [],
      },
    };
  }

  // -------------------------------------------------------- les tableaux
  let places = ctx.places;
  let nouvellesPlaces: PlaceTableau[] = [];
  const avertissements: string[] = [];
  if (places.length === 0) {
    const q = qualification(ctx);
    avertissements.push(...q.avertissements);
    if (q.principal.length < 2) return { fini: true, raison: 'Un seul qualifié : pas de phase finale.' };
    const poser = (tableau: Tableau, liste: typeof q.principal) => {
      const pos = placerTableau(liste.map((i) => ({ id: i.id, poule: i.poule, club: i.club, tier: i.rangPoule })));
      return pos.map((equipeId, i): PlaceTableau => ({ tableau, position: i + 1, equipeId }));
    };
    nouvellesPlaces = poser('principal', q.principal);
    if (params.consolante && q.consolante.length >= 2) nouvellesPlaces.push(...poser('consolante', q.consolante));
    places = nouvellesPlaces;
  }

  const lignes: PropositionPoules['rencontres'] = [];
  let tourTableau = 0;
  for (const tableau of ['principal', 'consolante'] as Tableau[]) {
    const pl = placesDuTableau(places, tableau);
    if (pl.length < 2) continue;
    const jouees = rencontres.filter((r) => r.phase === tableau && r.place != null) as (RencontrePoules & { place: number })[];
    for (const r of prochainesRencontresTableau(pl, jouees, but)) {
      tourTableau = Math.max(tourTableau, r.tour);
      lignes.push({ pouleId: null, tableau, tour: r.tour, place: r.place, equipeA: r.equipeA, equipeB: r.equipeB, terrain: 1 });
    }
  }
  if (!lignes.length) return { fini: true, raison: 'Les tableaux sont terminés.' };
  attribuer(lignes);
  return {
    fini: false,
    proposition: {
      phase: 'tableaux',
      libelle: `Phase finale — tour ${tourTableau}`,
      rencontres: lignes,
      nouvellesPlaces,
      avertissements,
    },
  };
}
