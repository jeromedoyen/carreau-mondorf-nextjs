/**
 * Banc d'essai du moteur de poules (`src/lib/tournoi/poules.ts`).
 *
 * Un appariement faux ne se voit pas à la relecture : il se voit le jour du
 * concours, quand deux équipes de la même poule se retrouvent dès le premier
 * tour du tableau. On simule donc des concours entiers, de bout en bout, sur
 * des effectifs et des réglages variés, avec un générateur aléatoire
 * déterministe pour que chaque échec soit rejouable.
 *
 *   npx tsx scripts/verifier-poules.ts [nombre de concours]
 */

import {
  classementTableau,
  classerPoule,
  composerPartiePoules,
  nbToursPoule,
  qualifiesParPoule,
  repartitionPoules,
  tirerPoules,
  type ContextePoules,
  type EquipePoules,
  type ModePoule,
  type ParametresPoules,
  type PlaceTableau,
  type PouleDef,
  type RencontrePoules,
  type Tableau,
} from '../src/lib/tournoi/poules';

function generateur(graine: number) {
  let x = graine >>> 0 || 1;
  return () => {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    return (x % 0x7fffffff) / 0x7fffffff;
  };
}

type Bilan = {
  problemes: string[];
  ignore: boolean;
  parties: number;
  memePouleTour1: number;
  memeClubTour1: number;
  memeClubPoule: number;
  memeClubPouleEvitable: number;
  configs: string[];
};

const C2 = (n: number) => (n * (n - 1)) / 2;

function simuler(graine: number): Bilan {
  const alea = generateur(graine);
  const entier = (a: number, b: number) => a + Math.floor(alea() * (b - a + 1));
  const problemes: string[] = [];
  const bilan: Bilan = { problemes, ignore: false, parties: 0, memePouleTour1: 0, memeClubTour1: 0, memeClubPoule: 0, memeClubPouleEvitable: 0, configs: [] };

  const nbEquipes = entier(3, 48);
  const mode: ModePoule = alea() < 0.5 ? 'repechage' : 'toutes_rondes';
  const params: ParametresPoules = {
    mode,
    taillePoule: entier(3, 5),
    qualifies: entier(1, 3),
    consolante: alea() < 0.7,
    pointsVictoire: 13,
    nbTerrains: entier(1, 24),
  };
  const nbClubs = entier(1, Math.max(1, Math.ceil(nbEquipes / 2)));
  const equipes: EquipePoules[] = Array.from({ length: nbEquipes }, (_, i) => ({
    id: i + 1,
    numero: i + 1,
    club: alea() < 0.15 ? null : `Club ${entier(1, nbClubs)}`,
  }));

  const rep = repartitionPoules(nbEquipes, params.taillePoule, mode);
  if ('erreur' in rep) {
    bilan.ignore = true;
    // l'erreur doit être justifiée : repêchage seulement, avec 5 équipes ou moins de 3
    if (!(nbEquipes < 3 || (mode === 'repechage' && nbEquipes === 5))) problemes.push(`repartition refusée à tort (${nbEquipes} équipes, ${mode}) : ${rep.erreur}`);
    return bilan;
  }
  const somme = rep.tailles.reduce((a, b) => a + b, 0);
  const max = mode === 'repechage' ? 4 : 5;
  if (somme !== nbEquipes) problemes.push(`tailles ${rep.tailles} ≠ ${nbEquipes}`);
  if (rep.tailles.some((t) => t < 3 || t > max)) problemes.push(`taille de poule hors bornes : ${rep.tailles}`);
  if (Math.max(...rep.tailles) - Math.min(...rep.tailles) > 1) problemes.push(`poules déséquilibrées : ${rep.tailles}`);

  const tirage = tirerPoules(equipes, rep.tailles, alea);
  const poules: PouleDef[] = tirage.poules.map((ids, i) => ({ id: 100 + i, numero: i + 1, equipes: ids }));
  const dansPoules = poules.flatMap((p) => p.equipes);
  if (new Set(dansPoules).size !== nbEquipes || dansPoules.length !== nbEquipes) problemes.push('une équipe manque ou est en double dans les poules');
  poules.forEach((p, i) => {
    if (p.equipes.length !== rep.tailles[i]) problemes.push(`poule ${p.numero} : ${p.equipes.length} équipes au lieu de ${rep.tailles[i]}`);
  });

  // conflits de club : jamais pire que la meilleure répartition théorique
  const parClub = new Map<string, number>();
  for (const e of equipes) if (e.club) parClub.set(e.club, (parClub.get(e.club) ?? 0) + 1);
  let minimum = 0;
  for (const c of parClub.values()) {
    const P = poules.length;
    const q = Math.floor(c / P);
    const r = c % P;
    minimum += r * C2(q + 1) + (P - r) * C2(q);
  }
  const reels = poules.reduce((s, p) => {
    const m = new Map<string, number>();
    for (const id of p.equipes) {
      const cl = equipes[id - 1].club;
      if (cl) m.set(cl, (m.get(cl) ?? 0) + 1);
    }
    return s + [...m.values()].reduce((a, n) => a + C2(n), 0);
  }, 0);
  if (reels !== tirage.conflitsClub) problemes.push(`conflitsClub annoncé ${tirage.conflitsClub} ≠ réel ${reels}`);
  bilan.memeClubPoule = reels;
  bilan.memeClubPouleEvitable = Math.max(0, reels - minimum);

  // ------------------------------------------------------------ le concours
  const rencontres: RencontrePoules[] = [];
  let places: PlaceTableau[] = [];
  const ctx = (): ContextePoules => ({ params, equipes, poules, rencontres, places });
  const toursTotal = Math.max(...poules.map((p) => nbToursPoule(mode, p.equipes.length)));
  let numero = 0;
  let termine = false;

  while (!termine && numero < 40) {
    numero++;
    let suite;
    try {
      suite = composerPartiePoules(ctx());
    } catch (e) {
      problemes.push(`partie ${numero} : exception ${(e as Error).message}`);
      return bilan;
    }
    if (suite.fini) {
      termine = true;
      break;
    }
    const prop = suite.proposition;
    if (prop.nouvellesPlaces.length) places = [...places, ...prop.nouvellesPlaces];

    // une équipe ne joue qu'une fois par partie ; terrains valides
    const vues = new Set<number>();
    for (const r of prop.rencontres) {
      for (const id of [r.equipeA, r.equipeB]) {
        if (vues.has(id)) problemes.push(`partie ${numero} : équipe ${id} joue deux fois`);
        vues.add(id);
      }
      if (r.equipeA === r.equipeB) problemes.push(`partie ${numero} : une équipe contre elle-même`);
      if (r.terrain < 1 || r.terrain > params.nbTerrains) problemes.push(`partie ${numero} : terrain ${r.terrain} hors 1..${params.nbTerrains}`);
    }
    if (prop.phase === 'poules' && numero > toursTotal) problemes.push(`partie ${numero} : poules au-delà du dernier tour`);
    if (prop.phase === 'tableaux' && numero <= toursTotal) problemes.push(`partie ${numero} : tableaux avant la fin des poules`);

    // résultats au hasard ; parfois des scores serrés pour provoquer des égalités
    for (const r of prop.rencontres) {
      const gagneA = alea() < 0.5;
      const perdant = alea() < 0.3 ? 11 : entier(0, 12);
      rencontres.push({
        partieNumero: numero,
        phase: r.pouleId != null ? 'poule' : (r.tableau as Tableau),
        pouleId: r.pouleId,
        tour: r.tour,
        place: r.place,
        terrain: r.terrain,
        equipeA: r.equipeA,
        equipeB: r.equipeB,
        scoreA: gagneA ? 13 : perdant,
        scoreB: gagneA ? perdant : 13,
      });
    }
  }
  bilan.parties = numero;
  if (!termine) {
    problemes.push('le concours ne se termine pas en 40 parties');
    return bilan;
  }

  // ---------------------------------------------- vérification des poules
  const dePoule = rencontres.filter((r) => r.phase === 'poule');
  for (const p of poules) {
    const siennes = dePoule.filter((r) => r.pouleId === p.id);
    const paires = new Map<string, number>();
    for (const r of siennes) {
      const cle = [r.equipeA, r.equipeB].sort((a, b) => a - b).join('-');
      // À repêchage, le barrage (tour 3) peut remettre face à face deux équipes du tour 1 : c'est la formule.
      const barrage = mode === 'repechage' && p.equipes.length === 4 && r.tour === 3;
      if (!barrage) paires.set(cle, (paires.get(cle) ?? 0) + 1);
      if (!p.equipes.includes(r.equipeA) || !p.equipes.includes(r.equipeB)) problemes.push(`poule ${p.numero} : adversaire d'une autre poule`);
    }
    if ([...paires.values()].some((n) => n > 1)) problemes.push(`poule ${p.numero} : revanche`);
    const attendues = mode === 'repechage' && p.equipes.length === 4 ? 5 : C2(p.equipes.length);
    if (siennes.length !== attendues) problemes.push(`poule ${p.numero} (${p.equipes.length}) : ${siennes.length} rencontres au lieu de ${attendues}`);
    const cl = classerPoule(mode, p.equipes, siennes, 13);
    if (!cl.complet) problemes.push(`poule ${p.numero} : classement incomplet`);
    if (new Set(cl.lignes.map((l) => l.id)).size !== p.equipes.length) problemes.push(`poule ${p.numero} : classement mal formé`);
    if (cl.lignes.some((l, i) => l.rang !== i + 1 && !l.exaequo && l.rang < i + 1)) problemes.push(`poule ${p.numero} : rangs incohérents`);
    if (mode === 'repechage' && p.equipes.length === 4) {
      // chaque équipe joue 2 ou 3 parties
      for (const id of p.equipes) {
        const n = siennes.filter((r) => r.equipeA === id || r.equipeB === id).length;
        if (n < 2 || n > 3) problemes.push(`poule ${p.numero} : l'équipe ${id} joue ${n} parties`);
      }
    }
  }

  // ------------------------------------------ vérification des tableaux
  const qualifies = poules.reduce((s, p) => s + qualifiesParPoule(params, p.equipes.length), 0);
  const attenduPrincipal = qualifies;
  const attenduConsolante = params.consolante && nbEquipes - qualifies >= 2 ? nbEquipes - qualifies : 0;
  const principal = places.filter((p) => p.tableau === 'principal' && p.equipeId != null);
  const consolante = places.filter((p) => p.tableau === 'consolante' && p.equipeId != null);
  if (attenduPrincipal >= 2) {
    if (principal.length !== attenduPrincipal) problemes.push(`principal : ${principal.length} équipes au lieu de ${attenduPrincipal}`);
    if (consolante.length !== attenduConsolante) problemes.push(`consolante : ${consolante.length} équipes au lieu de ${attenduConsolante}`);
  } else if (places.length) problemes.push('des tableaux alors qu\'il y a moins de 2 qualifiés');

  const idsPrincipal = new Set(principal.map((p) => p.equipeId));
  if (consolante.some((p) => idsPrincipal.has(p.equipeId))) problemes.push('une équipe est dans les deux tableaux');

  const equipeVers = (id: number) => equipes[id - 1];
  const pouleDe = (id: number) => poules.find((p) => p.equipes.includes(id))!.id;

  for (const tableau of ['principal', 'consolante'] as Tableau[]) {
    const pl = places.filter((p) => p.tableau === tableau).sort((a, b) => a.position - b.position).map((p) => p.equipeId);
    const n = pl.filter((x) => x != null).length;
    if (n < 2) continue;
    const jouees = rencontres.filter((r) => r.phase === tableau);
    if (jouees.length !== n - 1) problemes.push(`${tableau} : ${jouees.length} rencontres pour ${n} équipes (attendu ${n - 1})`);
    const cl = classementTableau(pl, jouees, 13);
    if (cl.some((c) => c.rang == null)) problemes.push(`${tableau} : classement incomplet`);
    if (cl.filter((c) => c.rang === 1).length !== 1) problemes.push(`${tableau} : pas de champion unique`);
    // chaque équipe est éliminée une seule fois : n-1 éliminées
    if (cl.filter((c) => c.rang !== 1).length !== n - 1) problemes.push(`${tableau} : éliminations incohérentes`);
    // premier tour : mêmes poules / mêmes clubs
    for (const r of jouees.filter((x) => x.tour === 1)) {
      if (tableau === 'principal' && pouleDe(r.equipeA) === pouleDe(r.equipeB)) {
        bilan.memePouleTour1++;
        bilan.configs.push(`${poules.length} poules, ${mode}, k=${qualifiesParPoule(params, poules[0].equipes.length)}, tailles ${poules.map((p) => p.equipes.length).join('/')}, ${n} qualifiés`);
      }
      const ca = equipeVers(r.equipeA).club;
      if (tableau === 'principal' && ca && ca === equipeVers(r.equipeB).club) bilan.memeClubTour1++;
    }
    // chaque tour : deux équipes ne se rencontrent qu'une fois dans le tableau
    const parTour = new Map<number, Set<number>>();
    for (const r of jouees) {
      const s = parTour.get(r.tour) ?? new Set<number>();
      for (const id of [r.equipeA, r.equipeB]) {
        if (s.has(id)) problemes.push(`${tableau} tour ${r.tour} : équipe ${id} en double`);
        s.add(id);
      }
      parTour.set(r.tour, s);
    }
  }
  return bilan;
}

// ------------------------------------------------------------------- lancement
const nb = Number(process.argv[2]) > 0 ? Number(process.argv[2]) : 3000;
let echecs = 0;
let jouees = 0;
let ignores = 0;
let memePouleTour1 = 0;
let memeClubTour1 = 0;
let memeClubPouleEvitable = 0;
let memeClubPoule = 0;
let partiesMax = 0;
const exemples: string[] = [];
const configsPoule = new Map<string, number>();

for (let g = 1; g <= nb; g++) {
  const b = simuler(g * 7919);
  if (b.ignore && !b.problemes.length) {
    ignores++;
    continue;
  }
  jouees++;
  memePouleTour1 += b.memePouleTour1;
  memeClubTour1 += b.memeClubTour1;
  memeClubPouleEvitable += b.memeClubPouleEvitable;
  memeClubPoule += b.memeClubPoule;
  partiesMax = Math.max(partiesMax, b.parties);
  for (const c of b.configs) configsPoule.set(c, (configsPoule.get(c) ?? 0) + 1);
  if (b.problemes.length) {
    echecs++;
    if (exemples.length < 8) exemples.push(`graine ${g * 7919} : ${b.problemes.slice(0, 3).join(' | ')}`);
  }
}

console.log(`Concours simulés : ${jouees} (${ignores} réglages impossibles, refusés à bon droit)`);
console.log(`Concours avec au moins un problème : ${echecs}`);
exemples.forEach((e) => console.log('  ' + e));
console.log(`Parties au plus longues : ${partiesMax}`);
console.log(`Premier tour du tableau principal : ${memePouleTour1} rencontre(s) entre équipes de la même poule`);
[...configsPoule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).forEach(([c, n]) => console.log(`    ${n} × ${c}`));
console.log(`Premier tour du tableau principal : ${memeClubTour1} rencontre(s) entre équipes du même club (information)`);
console.log(`Poules : ${memeClubPoule} paires de même club réunies, dont ${memeClubPouleEvitable} au-delà du minimum théorique`);
process.exit(echecs > 0 || memeClubPouleEvitable > 0 ? 1 : 0);
