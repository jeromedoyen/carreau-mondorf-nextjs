/**
 * Essai du format « poules » contre la VRAIE base (migration 0076), avec des
 * concours jetables supprimés à la fin.
 *
 * Le moteur pur est simulé par `verifier-poules.ts`. Ici on vérifie ce que la
 * simulation ne voit pas : la traduction entre le moteur et les tables
 * (lecture, tirage enregistré, parties, positions des tableaux, contraintes,
 * suppression en cascade). Les fonctions testées reçoivent un client injecté,
 * donc on peut les jouer avec la clé de service, sans session de connexion.
 *
 *   npx tsx --env-file=.env.local scripts/verifier-poules-base.ts
 */

import { createClient } from '@supabase/supabase-js';
import { composerPartiePoules, type ModePoule } from '../src/lib/tournoi/poules';
import {
  construireVuePoules,
  enregistrerClubsEquipes,
  enregistrerPartiePoules,
  lireEtatPoules,
  lireParametresPoules,
  tirerEtEnregistrerPoules,
} from '../src/lib/tournoi/poulesDonnees';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

function generateur(graine: number) {
  let x = graine >>> 0 || 1;
  return () => {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0;
    return (x % 0x7fffffff) / 0x7fffffff;
  };
}

type Cas = { nbEquipes: number; mode: ModePoule; taille: number; qualifies: number; consolante: boolean; terrains: number; clubs: number };

const CAS: Cas[] = [
  { nbEquipes: 16, mode: 'repechage', taille: 4, qualifies: 2, consolante: true, terrains: 8, clubs: 5 },
  { nbEquipes: 10, mode: 'repechage', taille: 4, qualifies: 2, consolante: true, terrains: 5, clubs: 3 },
  { nbEquipes: 14, mode: 'toutes_rondes', taille: 4, qualifies: 2, consolante: true, terrains: 6, clubs: 4 },
  { nbEquipes: 9, mode: 'toutes_rondes', taille: 3, qualifies: 1, consolante: false, terrains: 4, clubs: 9 },
  { nbEquipes: 6, mode: 'repechage', taille: 3, qualifies: 2, consolante: true, terrains: 3, clubs: 2 },
];

const problemes: string[] = [];
const verifier = (condition: boolean, message: string) => {
  if (!condition) problemes.push(message);
};

async function jouer(cas: Cas, graine: number) {
  const alea = generateur(graine);
  const nom = `ESSAI-POULES-${Date.now()}-${graine}`;
  const etiquette = `${cas.nbEquipes} équipes, ${cas.mode}, ${cas.consolante ? 'consolante' : 'sans consolante'}`;

  const { data: t, error } = await supabase
    .from('tournois')
    .insert({
      nom,
      date_tournoi: '2026-10-30',
      format: 'poules',
      taille_equipe: 2,
      nb_parties: 1,
      nb_terrains: cas.terrains,
      points_victoire: 13,
      cree_par_email: 'essai@example.com',
      poules_mode: cas.mode,
      poules_taille: cas.taille,
      poules_qualifies: cas.qualifies,
      poules_consolante: cas.consolante,
    })
    .select('id')
    .single();
  if (error || !t) throw new Error(`création du tournoi : ${error?.message}`);
  const tournoiId = t.id as number;

  try {
    // équipes fixes : deux invités par équipe, un club par équipe
    const { data: parts } = await supabase
      .from('tournoi_participants')
      .insert(Array.from({ length: cas.nbEquipes * 2 }, (_, i) => ({ tournoi_id: tournoiId, personne_id: null, nom: `Joueur ${i + 1}`, ordre: i })))
      .select('id');
    const { data: equipes } = await supabase
      .from('tournoi_equipes')
      .insert(Array.from({ length: cas.nbEquipes }, (_, i) => ({ tournoi_id: tournoiId, partie_id: null, numero: i + 1 })))
      .select('id, numero');
    verifier(parts?.length === cas.nbEquipes * 2 && equipes?.length === cas.nbEquipes, `${etiquette} : création des équipes`);
    const ordonnees = [...(equipes ?? [])].sort((a, b) => a.numero - b.numero);
    await supabase.from('tournoi_equipe_membres').insert(
      ordonnees.flatMap((e, i) => [
        { equipe_id: e.id, participant_id: parts![2 * i].id },
        { equipe_id: e.id, participant_id: parts![2 * i + 1].id },
      ]),
    );

    const params = await lireParametresPoules(supabase, tournoiId);
    verifier(params?.mode === cas.mode && params?.nbTerrains === cas.terrains, `${etiquette} : paramètres relus`);
    if (!params) return;

    const clubsSaisis = ordonnees.map((e, i) => ({ equipeId: e.id as number, club: `Club ${1 + (i % cas.clubs)}` }));
    const rc = await enregistrerClubsEquipes(supabase, tournoiId, clubsSaisis);
    verifier(rc.ok, `${etiquette} : enregistrement des clubs`);

    // tirage, puis refait : le second remplace le premier
    const tirage1 = await tirerEtEnregistrerPoules(supabase, tournoiId, params, alea);
    const tirage2 = await tirerEtEnregistrerPoules(supabase, tournoiId, params, alea);
    verifier(tirage1.ok && tirage2.ok, `${etiquette} : tirage (${tirage1.ok ? '' : (tirage1 as { error: string }).error})`);
    let etat = await lireEtatPoules(supabase, tournoiId, params);
    const nbEquipesPoules = etat.ctx.poules.flatMap((p) => p.equipes);
    verifier(etat.ctx.poules.length > 0, `${etiquette} : aucune poule après tirage`);
    verifier(new Set(nbEquipesPoules).size === cas.nbEquipes, `${etiquette} : ${nbEquipesPoules.length} équipes en poules au lieu de ${cas.nbEquipes} (le second tirage a-t-il laissé des restes ?)`);
    verifier(etat.ctx.equipes.every((e) => e.club?.startsWith('Club ')), `${etiquette} : clubs non relus`);

    // le tirage est refusé dès qu'une partie existe
    // (vérifié plus bas, après la première partie)

    // ---------------------------------------------------- on joue le concours
    let numero = 0;
    let fini = false;
    let premierePartie = true;
    while (!fini && numero < 30) {
      numero++;
      etat = await lireEtatPoules(supabase, tournoiId, params);
      const suite = composerPartiePoules(etat.ctx);
      if (suite.fini) {
        fini = true;
        break;
      }
      const r = await enregistrerPartiePoules(supabase, tournoiId, numero, suite.proposition);
      verifier(r.ok, `${etiquette} : partie ${numero} non enregistrée (${r.ok ? '' : r.error})`);
      if (!r.ok) return;

      if (premierePartie) {
        premierePartie = false;
        const refus = await tirerEtEnregistrerPoules(supabase, tournoiId, params, alea);
        verifier(!refus.ok, `${etiquette} : le tirage doit être refusé une fois une partie composée`);
      }

      // saisie des scores, comme l'écran : une rencontre à la fois
      const { data: rencontres } = await supabase
        .from('tournoi_rencontres')
        .select('id')
        .eq('partie_id', r.partieId);
      verifier((rencontres?.length ?? 0) === suite.proposition.rencontres.length, `${etiquette} : partie ${numero} : rencontres enregistrées ≠ proposées`);
      for (const ren of rencontres ?? []) {
        const gagneA = alea() < 0.5;
        const perdant = Math.floor(alea() * 13);
        const { error: eS } = await supabase
          .from('tournoi_rencontres')
          .update({ score_a: gagneA ? 13 : perdant, score_b: gagneA ? perdant : 13 })
          .eq('id', ren.id);
        verifier(!eS, `${etiquette} : saisie d'un score (${eS?.message})`);
      }
    }
    verifier(fini, `${etiquette} : le concours ne se termine pas`);

    // ------------------------------------------------------- relecture finale
    etat = await lireEtatPoules(supabase, tournoiId, params);
    const vue = construireVuePoules(etat);
    verifier(vue.fini, `${etiquette} : la vue ne voit pas la fin`);
    verifier(vue.poules.every((p) => p.complet), `${etiquette} : une poule est incomplète`);
    verifier(vue.tableaux.length >= 1 && vue.tableaux[0].termine, `${etiquette} : tableau principal non terminé`);
    verifier(vue.tableaux.every((tab) => tab.classement.every((c) => c.rang != null)), `${etiquette} : classement de tableau incomplet`);
    verifier(
      vue.tableaux.some((x) => x.tableau === 'consolante') === (cas.consolante && cas.nbEquipes - vue.tableaux[0].places.filter((p) => p != null).length >= 2),
      `${etiquette} : consolante présente/absente à tort`,
    );
    const sansEtiquette = etat.rencontres.filter((r) => !vue.etiquettes[r.id]);
    verifier(sansEtiquette.length === 0, `${etiquette} : ${sansEtiquette.length} rencontre(s) sans libellé`);

    // annuler la dernière partie défait ses positions si c'est la première des tableaux
    const premiereTableaux = etat.parties.find((p) => p.phase === 'tableaux');
    if (premiereTableaux) {
      const apres = etat.parties.filter((p) => p.numero > premiereTableaux.numero);
      for (const p of [...apres].reverse()) await supabase.from('tournoi_parties').delete().eq('id', p.id);
      await supabase.from('tournoi_parties').delete().eq('id', premiereTableaux.id);
      const { count } = await supabase.from('tournoi_tableau_places').select('id', { count: 'exact', head: true }).eq('tournoi_id', tournoiId);
      verifier((count ?? -1) === 0, `${etiquette} : positions de tableau restantes après annulation (${count})`);
      // et la partie peut être recomposée à l'identique en nombre de rencontres
      const rejoue = construireVuePoules(await lireEtatPoules(supabase, tournoiId, params));
      verifier(!rejoue.fini && rejoue.prochaine?.startsWith('Phase finale') === true, `${etiquette} : la phase finale n'est plus proposée après annulation (${rejoue.prochaine})`);
    }
    console.log(`  ok  ${etiquette} : ${numero - 1} parties jouées, ${vue.poules.length} poules`);
  } finally {
    await supabase.from('tournois').delete().eq('id', tournoiId);
    const { count } = await supabase.from('tournoi_poules').select('id', { count: 'exact', head: true }).eq('tournoi_id', tournoiId);
    const { count: c2 } = await supabase.from('tournoi_equipes').select('id', { count: 'exact', head: true }).eq('tournoi_id', tournoiId);
    verifier((count ?? 0) === 0 && (c2 ?? 0) === 0, `${etiquette} : suppression en cascade incomplète`);
  }
}

(async () => {
  // restes d'un essai interrompu
  await supabase.from('tournois').delete().like('nom', 'ESSAI-POULES-%');

  for (const [i, cas] of CAS.entries()) {
    try {
      await jouer(cas, 1000 + i * 17);
    } catch (e) {
      problemes.push(`${cas.nbEquipes} équipes ${cas.mode} : exception ${(e as Error).message}`);
    }
  }
  const { count } = await supabase.from('tournois').select('id', { count: 'exact', head: true }).like('nom', 'ESSAI-POULES-%');
  console.log(`Concours d'essai restants en base : ${count}`);
  console.log(problemes.length ? `PROBLEMES (${problemes.length}) :\n  - ${problemes.join('\n  - ')}` : 'Aucun problème.');
  process.exit(problemes.length || count ? 1 : 0);
})();
