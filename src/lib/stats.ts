import { supabase } from './supabase';
import type {
  StatEquipeD2,
  StatistiquesD2,
  StatistiquesPromotion,
  StatJoueurD2,
  StatJoueurPromotion,
  StatTrioPromotion,
} from './types';

/** Port de sansAccents_() (ChampionnatBackend.gs) : clé de regroupement
 *  insensible à la casse/aux accents, pour fusionner les variantes d'écriture
 *  d'un même nom de joueur ("BACK Yves" vs "Back Yves"). */
function sansAccents(texte: string): string {
  return String(texte || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function meilleurAffichage(actuel: string | undefined, candidat: string): string {
  if (!actuel) return candidat;
  const premierMotMajuscule = (s: string) => {
    const m = s.match(/^(\S+)/);
    return !!m && m[1] === m[1].toUpperCase() && m[1] !== m[1].toLowerCase();
  };
  if (!premierMotMajuscule(actuel) && premierMotMajuscule(candidat)) return candidat;
  return actuel;
}

type LigneParty = {
  rencontre_id: number;
  type: string;
  phase: number;
  joueurs_cm: string;
  score_cm: number | null;
  score_adverse: number | null;
};

type LigneRencontre = {
  id: number;
  journee: number;
  date: string;
  club_adverse: string | null;
};

/** Port fidèle de calculerStatistiquesJoueurs_() (ChampionnatBackend.gs:1244) —
 *  même regroupement, mêmes clés, même tri. Ne recalcule rien que l'app
 *  d'origine n'a pas déjà décidé ; se contente de lire parties_d2/rencontres_d2
 *  (déjà nettoyées côté source, cf. commentaire du schéma SQL). */
export async function getStatistiquesJoueursD2(saison: string): Promise<StatistiquesD2> {
  const { data: rencontresData, error: errR } = await supabase
    .from('rencontres_d2')
    .select('id, journee, date, club_adverse')
    .eq('saison', saison);
  if (errR) throw errR;
  const rencontres = (rencontresData ?? []) as LigneRencontre[];
  const rencontreParId = new Map(rencontres.map((r) => [r.id, r]));

  const { data: partiesData, error: errP } = await supabase
    .from('parties_d2')
    .select('rencontre_id, type, phase, joueurs_cm, score_cm, score_adverse')
    .in('rencontre_id', rencontres.map((r) => r.id))
    .eq('supprime', false)
    .not('score_cm', 'is', null)
    .not('score_adverse', 'is', null);
  if (errP) throw errP;
  const parties = (partiesData ?? []) as LigneParty[];

  type StatBrute = {
    nomAffiche: string;
    parType: Record<string, { joues: number; victoires: number }>;
    parties: StatJoueurD2['parties'];
  };
  const statsParJoueur = new Map<string, StatBrute>();
  const statsParEquipe = new Map<string, StatEquipeD2 & { joueurs: string[] }>();

  parties.forEach((p) => {
    const rencontre = rencontreParId.get(p.rencontre_id);
    if (!rencontre) return;
    const noms = String(p.joueurs_cm || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!noms.length) return;
    const scoreCM = Number(p.score_cm);
    const scoreAdverse = Number(p.score_adverse);
    const gagne = scoreCM > scoreAdverse;
    const type = p.type;

    noms.forEach((nom) => {
      const cleNom = sansAccents(nom);
      if (!statsParJoueur.has(cleNom)) {
        statsParJoueur.set(cleNom, { nomAffiche: nom, parType: {}, parties: [] });
      }
      const s = statsParJoueur.get(cleNom)!;
      s.nomAffiche = meilleurAffichage(s.nomAffiche, nom);
      if (!s.parType[type]) s.parType[type] = { joues: 0, victoires: 0 };
      s.parType[type].joues++;
      if (gagne) s.parType[type].victoires++;
      s.parties.push({
        idRencontre: rencontre.id,
        journee: rencontre.journee,
        date: rencontre.date,
        adversaireClub: rencontre.club_adverse,
        phase: p.phase,
        type,
        scoreCM,
        scoreAdverse,
        gagne,
        partenaires: noms.filter((n) => n !== nom),
      });
    });

    if (noms.length > 1) {
      const nomsTries = [...noms].sort((a, b) => sansAccents(a).localeCompare(sansAccents(b)));
      const cle = type + '|' + nomsTries.map(sansAccents).join(' + ');
      if (!statsParEquipe.has(cle)) {
        statsParEquipe.set(cle, { type, joueurs: nomsTries, joues: 0, victoires: 0, tauxVictoire: 0 });
      }
      const e = statsParEquipe.get(cle)!;
      e.joues++;
      if (gagne) e.victoires++;
    }
  });

  const joueurs: StatJoueurD2[] = Array.from(statsParJoueur.values()).map((s) => {
    let joues = 0;
    let victoires = 0;
    Object.values(s.parType).forEach((t) => {
      joues += t.joues;
      victoires += t.victoires;
    });
    const partiesTri = [...s.parties].sort((a, b) => b.date.localeCompare(a.date));
    return {
      nom: s.nomAffiche,
      parType: s.parType,
      parties: partiesTri,
      joues,
      victoires,
      tauxVictoire: joues ? victoires / joues : 0,
    };
  });
  joueurs.sort((a, b) => b.tauxVictoire - a.tauxVictoire || b.joues - a.joues);

  const equipes: StatEquipeD2[] = Array.from(statsParEquipe.values()).map((e) => ({
    ...e,
    tauxVictoire: e.joues ? e.victoires / e.joues : 0,
  }));
  equipes.sort((a, b) => b.tauxVictoire - a.tauxVictoire || b.joues - a.joues);

  return { joueurs, equipes };
}

type LigneEquipePromotion = {
  numero_equipe: number;
  journee: number;
  joueur_1: string | null;
  joueur_2: string | null;
  joueur_3: string | null;
  parties_gagnees: number;
};

/** Pas de port direct côté Apps Script (le classement multi-clubs de la
 *  Promotion n'a jamais été affiché, cf. CONTEXTE_PROJET.md) — calcul propre
 *  à ce prototype, à partir des trios déjà importés (promotion_equipes),
 *  sans détail de partie individuelle (non transcrit à l'import, cf.
 *  scripts/import-csv.ts). Chaque partie du trio (sur 4) est comptée comme
 *  jouée par chacun des 3 joueurs ; victoire = partie gagnée par le trio,
 *  répartie de la même façon (on ne sait pas qui, dans le trio, a joué
 *  quelle partie individuellement). */
export async function getStatistiquesPromotion(saison: string): Promise<StatistiquesPromotion> {
  const { data, error } = await supabase
    .from('promotion_equipes')
    .select('numero_equipe, journee, joueur_1, joueur_2, joueur_3, parties_gagnees')
    .eq('saison', saison);
  if (error) throw error;
  const equipes = (data ?? []) as LigneEquipePromotion[];

  const statsParJoueur = new Map<
    string,
    { nomAffiche: string; participations: number; partiesGagnees: number }
  >();
  const statsParTrio = new Map<
    string,
    { joueurs: string[]; participations: number; partiesGagnees: number }
  >();

  equipes.forEach((e) => {
    const noms = [e.joueur_1, e.joueur_2, e.joueur_3].filter((n): n is string => !!n && n.trim().length > 0);
    if (!noms.length) return;

    noms.forEach((nom) => {
      const cle = sansAccents(nom);
      if (!statsParJoueur.has(cle)) {
        statsParJoueur.set(cle, { nomAffiche: nom, participations: 0, partiesGagnees: 0 });
      }
      const s = statsParJoueur.get(cle)!;
      s.nomAffiche = meilleurAffichage(s.nomAffiche, nom);
      s.participations++;
      s.partiesGagnees += e.parties_gagnees;
    });

    if (noms.length > 1) {
      const nomsTries = [...noms].sort((a, b) => sansAccents(a).localeCompare(sansAccents(b)));
      const cle = nomsTries.map(sansAccents).join(' + ');
      if (!statsParTrio.has(cle)) {
        statsParTrio.set(cle, { joueurs: nomsTries, participations: 0, partiesGagnees: 0 });
      }
      const t = statsParTrio.get(cle)!;
      t.participations++;
      t.partiesGagnees += e.parties_gagnees;
    }
  });

  const joueurs: StatJoueurPromotion[] = Array.from(statsParJoueur.values()).map((s) => {
    const partiesJouees = s.participations * 4;
    return {
      nom: s.nomAffiche,
      participations: s.participations,
      partiesJouees,
      partiesGagnees: s.partiesGagnees,
      tauxVictoire: partiesJouees ? s.partiesGagnees / partiesJouees : 0,
    };
  });
  joueurs.sort((a, b) => b.tauxVictoire - a.tauxVictoire || b.participations - a.participations);

  const trios: StatTrioPromotion[] = Array.from(statsParTrio.values()).map((t) => {
    const partiesJouees = t.participations * 4;
    return {
      joueurs: t.joueurs,
      participations: t.participations,
      partiesJouees,
      partiesGagnees: t.partiesGagnees,
      tauxVictoire: partiesJouees ? t.partiesGagnees / partiesJouees : 0,
    };
  });
  trios.sort((a, b) => b.tauxVictoire - a.tauxVictoire || b.participations - a.participations);

  return { joueurs, trios };
}
