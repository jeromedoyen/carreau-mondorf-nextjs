/**
 * Banc d'essai du moteur de tournoi (`src/lib/tournoi/moteur.ts`).
 *
 * Le moteur décide des appariements d'un concours réel : une erreur ne se voit
 * pas à la relecture, elle se voit le dimanche quand deux équipes se
 * retrouvent pour la troisième fois. On le simule donc massivement, sur les
 * deux formats et sur des effectifs variés, avec un générateur aléatoire
 * déterministe pour que chaque échec soit rejouable.
 *
 *   npx tsx scripts/verifier-moteur.ts
 */

import {
  composerProchainePartie,
  construireHistorique,
  classer,
  repartirEffectif,
  scoreValide,
  statistiquesEquipes,
  statistiquesParticipants,
  partiesMaxSansRevanche,
  type PartieJouee,
  type ParametresTournoi,
  type FormatTournoi,
} from '../src/lib/tournoi/moteur';

/** Générateur déterministe : une graine = un tournoi rejouable à l'identique. */
function generateur(graine: number) {
  let x = graine >>> 0 || 1;
  return () => {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    return (x % 0x7fffffff) / 0x7fffffff;
  };
}

type Resultat = {
  problemes: string[];
  revanchesForcees: number;
  repetitionsAdversaires: number;
  repetitionsTerrain: number;
  coequipiersRepetes: number;
  repartition: Record<number, number>;
};

function simuler(
  graine: number,
  format: FormatTournoi,
  nbJoueursOuEquipes: number,
  nbParties: number,
  tailleEquipe: number,
  nbTerrains: number,
): Resultat {
  const alea = generateur(graine);
  const params: ParametresTournoi = { format, tailleEquipe, nbParties, nbTerrains, pointsVictoire: 13 };
  const problemes: string[] = [];

  // participants : nbJoueursOuEquipes équipes de `tailleEquipe`, ou autant de joueurs
  const nbJoueurs =
    format === 'equipes_fixes' ? nbJoueursOuEquipes * tailleEquipe : nbJoueursOuEquipes;
  const participants = Array.from({ length: nbJoueurs }, (_, i) => i + 1);

  const equipesPermanentes =
    format === 'equipes_fixes'
      ? Array.from({ length: nbJoueursOuEquipes }, (_, i) => ({
          id: i + 1,
          numero: i + 1,
          membres: participants.slice(i * tailleEquipe, (i + 1) * tailleEquipe),
        }))
      : [];

  const parties: PartieJouee[] = [];
  let prochainIdEquipe = format === 'equipes_fixes' ? nbJoueursOuEquipes + 1 : 1;
  let revanchesForcees = 0;
  let repetitionsAdversaires = 0;

  for (let n = 1; n <= nbParties; n++) {
    const prop = composerProchainePartie(
      n,
      params,
      equipesPermanentes,
      participants,
      parties,
      alea,
    );
    if (prop.revancheForcee) revanchesForcees++;
    repetitionsAdversaires += prop.repetitionsAdversaires;

    // attribue des ids comme le ferait la base
    const equipes = prop.equipes.map((e) => ({
      id: e.id ?? prochainIdEquipe++,
      numero: e.numero,
      membres: e.membres,
    }));

    const rencontres = prop.rencontres.map((r) => {
      const gagneA = alea() < 0.5;
      const perdant = Math.floor(alea() * 13);
      return {
        terrain: r.terrain,
        equipeA: equipes[r.indexA].id,
        equipeB: equipes[r.indexB].id,
        scoreA: gagneA ? 13 : perdant,
        scoreB: gagneA ? perdant : 13,
      };
    });

    parties.push({
      numero: n,
      equipes,
      rencontres,
      equipeExempteId: prop.indexExempt == null ? null : equipes[prop.indexExempt].id,
    });
  }

  // ------------------------------------------------------- vérifications
  const vusEquipes = new Set<string>();
  const vusJoueurs = new Set<string>();
  let coequipiersRepetes = 0;
  const coequipiersVus = new Set<string>();
  const terrainsJoueur = new Map<number, Map<number, number>>();
  const partiesJouees = new Map<number, number>();

  for (const p of parties) {
    const parId = new Map(p.equipes.map((e) => [e.id, e]));
    const engages = new Set<number>();

    for (const e of p.equipes) {
      for (const m of e.membres) {
        if (engages.has(m)) problemes.push(`joueur ${m} dans deux équipes au tour ${p.numero}`);
        engages.add(m);
      }
      for (let i = 0; i < e.membres.length; i++) {
        for (let j = i + 1; j < e.membres.length; j++) {
          const k = [e.membres[i], e.membres[j]].sort((a, b) => a - b).join('-');
          if (coequipiersVus.has(k) && format === 'melee') coequipiersRepetes++;
          coequipiersVus.add(k);
        }
      }
    }
    if (engages.size !== participants.length) {
      problemes.push(`tour ${p.numero} : ${engages.size} joueurs engagés sur ${participants.length}`);
    }

    const enJeu = new Set<number>();
    for (const r of p.rencontres) {
      if (format === 'equipes_fixes') {
        const k = [r.equipeA, r.equipeB].sort((a, b) => a - b).join('-');
        if (vusEquipes.has(k)) problemes.push(`revanche équipes ${k} au tour ${p.numero}`);
        vusEquipes.add(k);
      }
      const mA = parId.get(r.equipeA)!.membres;
      const mB = parId.get(r.equipeB)!.membres;
      for (const a of [...mA, ...mB]) {
        if (enJeu.has(a)) problemes.push(`joueur ${a} sur deux terrains au tour ${p.numero}`);
        enJeu.add(a);
        partiesJouees.set(a, (partiesJouees.get(a) ?? 0) + 1);
        let c = terrainsJoueur.get(a);
        if (!c) terrainsJoueur.set(a, (c = new Map()));
        c.set(r.terrain, (c.get(r.terrain) ?? 0) + 1);
      }
      for (const a of mA) for (const b of mB) vusJoueurs.add([a, b].sort((x, y) => x - y).join('-'));
      if (r.terrain < 1 || r.terrain > nbTerrains) problemes.push(`terrain ${r.terrain} hors bornes`);
    }

    if (p.equipeExempteId != null) {
      for (const m of parId.get(p.equipeExempteId)!.membres) {
        partiesJouees.set(m, (partiesJouees.get(m) ?? 0) + 1);
      }
    }

    // pas plus de rencontres qu'il n'y a de terrains… sauf en vagues assumées
    const parTerrain = new Map<number, number>();
    for (const r of p.rencontres) parTerrain.set(r.terrain, (parTerrain.get(r.terrain) ?? 0) + 1);
    const vagues = Math.max(0, ...parTerrain.values());
    const vaguesAttendues = Math.ceil(p.rencontres.length / nbTerrains);
    if (vagues > vaguesAttendues) {
      problemes.push(`tour ${p.numero} : ${vagues} vagues sur un terrain, ${vaguesAttendues} attendues`);
    }
  }

  for (const [j, n] of partiesJouees) {
    if (n !== nbParties) problemes.push(`joueur ${j} a joué ${n} parties au lieu de ${nbParties}`);
  }

  let repetitionsTerrain = 0;
  for (const c of terrainsJoueur.values()) {
    for (const v of c.values()) if (v > 1) repetitionsTerrain += v - 1;
  }

  // classement cohérent
  const stats =
    format === 'equipes_fixes'
      ? statistiquesEquipes(parties, 13)
      : statistiquesParticipants(parties, participants, 13);
  const cl = classer(stats);
  for (let i = 1; i < cl.length; i++) {
    const a = cl[i - 1];
    const b = cl[i];
    const ok =
      a.victoires > b.victoires ||
      (a.victoires === b.victoires && a.diff > b.diff) ||
      (a.victoires === b.victoires && a.diff === b.diff && a.pointsPour >= b.pointsPour);
    if (!ok) problemes.push(`classement mal trié entre ${a.id} et ${b.id}`);
  }
  const sommeDiff = cl.reduce((s, e) => s + e.diff, 0);
  if (sommeDiff !== 0) problemes.push(`somme des goal-average = ${sommeDiff}, attendu 0`);

  const repartition: Record<number, number> = {};
  for (const s of cl) repartition[s.victoires] = (repartition[s.victoires] ?? 0) + 1;

  return { problemes, revanchesForcees, repetitionsAdversaires, repetitionsTerrain, coequipiersRepetes, repartition };
}

// ------------------------------------------------------------------ tests

let echecsGlobaux = 0;

function campagne(
  titre: string,
  format: FormatTournoi,
  n: number,
  parties: number,
  taille: number,
  terrains: number,
  tirages = 200,
) {
  let ko = 0;
  let revanches = 0;
  let terrainsRep = 0;
  let coequipiers = 0;
  let advRep = 0;
  const exemples: string[] = [];
  for (let g = 1; g <= tirages; g++) {
    const r = simuler(g, format, n, parties, taille, terrains);
    if (r.problemes.length) {
      ko++;
      if (exemples.length < 2) exemples.push(`graine ${g} → ${r.problemes.slice(0, 3).join(' | ')}`);
    }
    revanches += r.revanchesForcees;
    terrainsRep += r.repetitionsTerrain;
    coequipiers += r.coequipiersRepetes;
    advRep += r.repetitionsAdversaires;
  }
  if (ko) echecsGlobaux += ko;
  const etat = ko === 0 ? 'OK  ' : 'ÉCHEC';
  console.log(
    `  ${etat} ${titre.padEnd(46)} échecs ${String(ko).padStart(3)}/${tirages}` +
      ` · revanches ${String(revanches).padStart(3)}` +
      ` · terrain répété ${(terrainsRep / tirages).toFixed(2)}` +
      (format === 'melee' ? ` · coéquipier répété ${(coequipiers / tirages).toFixed(2)} · adversaire revu ${(advRep / tirages).toFixed(1)}` : ''),
  );
  for (const e of exemples) console.log(`        ${e}`);
}

console.log('\n=== Format « équipes fixes » (système suisse) ===');
campagne('12 équipes · 4 parties · 6 terrains', 'equipes_fixes', 12, 4, 3, 6);
campagne('11 équipes · 4 parties · 6 terrains (impair)', 'equipes_fixes', 11, 4, 3, 6);
campagne('8 équipes · 4 parties · 4 terrains', 'equipes_fixes', 8, 4, 3, 4);
campagne('16 équipes · 5 parties · 8 terrains', 'equipes_fixes', 16, 5, 2, 8);
campagne('6 équipes · 5 parties · 3 terrains (limite N-1)', 'equipes_fixes', 6, 5, 2, 3);
campagne('20 équipes · 4 parties · 4 terrains (vagues)', 'equipes_fixes', 20, 4, 3, 4);

console.log('\n=== Format « à la mêlée » (classement individuel) ===');
campagne('36 joueurs · triplettes · 3 parties · 6 terrains', 'melee', 36, 3, 3, 6);
campagne('24 joueurs · doublettes · 4 parties · 6 terrains', 'melee', 24, 4, 2, 6);
campagne('14 joueurs · triplettes · 3 parties · 3 terrains', 'melee', 14, 3, 3, 3);
campagne('13 joueurs · doublettes · 3 parties · 4 terrains', 'melee', 13, 3, 2, 4);
campagne('30 joueurs · triplettes · 4 parties · 5 terrains', 'melee', 30, 4, 3, 5);

console.log('\n=== Répartition des effectifs ===');
for (const [n, k] of [
  [36, 3],
  [14, 3],
  [13, 3],
  [12, 3],
  [24, 2],
  [13, 2],
  [7, 3],
  [5, 3],
] as [number, number][]) {
  const t = repartirEffectif(n, k);
  const somme = t.reduce((a, b) => a + b, 0);
  const ok = somme === n && Math.min(...t) >= Math.min(k - 1, n) && Math.max(...t) <= k;
  if (!ok) echecsGlobaux++;
  console.log(
    `  ${ok ? 'OK  ' : 'ÉCHEC'} ${n} joueurs en ${k} → ${t.join('+')} (${t.length} équipes)`,
  );
}

console.log('\n=== Validation des scores (but à 13) ===');
const cas: [number | null, number | null, boolean, string][] = [
  [13, 7, true, '13-7 accepté'],
  [7, 13, true, '7-13 accepté'],
  [13, 13, false, '13-13 refusé (pas de nul)'],
  [12, 7, false, '12-7 refusé (personne au but)'],
  [13, 0, true, '13-0 accepté (forfait)'],
  [null, 7, false, 'score incomplet refusé'],
  [15, 9, true, '15-9 accepté (partie prolongée)'],
  [13, -1, false, 'score négatif refusé'],
];
for (const [a, b, attendu, libelle] of cas) {
  const obtenu = scoreValide({ scoreA: a, scoreB: b }, 13);
  if (obtenu !== attendu) echecsGlobaux++;
  console.log(`  ${obtenu === attendu ? 'OK  ' : 'ÉCHEC'} ${libelle}`);
}

console.log('\n=== Garde-fou nombre de parties ===');
for (const n of [6, 8, 12, 16]) {
  console.log(`  ${n} équipes → ${partiesMaxSansRevanche(n)} parties max sans revanche`);
}

console.log('\n=== Historique : une composition compte avant même le score ===');
{
  const parties: PartieJouee[] = [
    {
      numero: 1,
      equipes: [
        { id: 1, numero: 1, membres: [10, 11] },
        { id: 2, numero: 2, membres: [20, 21] },
      ],
      rencontres: [{ terrain: 1, equipeA: 1, equipeB: 2, scoreA: null, scoreB: null }],
      equipeExempteId: null,
    },
  ];
  const h = construireHistorique(parties);
  const ok = h.adversairesEquipe.get(1)?.has(2) === true && h.coequipiers.get(10)?.has(11) === true;
  if (!ok) echecsGlobaux++;
  console.log(`  ${ok ? 'OK  ' : 'ÉCHEC'} adversaires et coéquipiers enregistrés sans score saisi`);
}

console.log(
  echecsGlobaux === 0
    ? '\nTout est vert.\n'
    : `\n${echecsGlobaux} vérification(s) en échec.\n`,
);
process.exit(echecsGlobaux === 0 ? 0 : 1);
