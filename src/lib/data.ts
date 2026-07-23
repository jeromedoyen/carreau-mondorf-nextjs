import { supabase } from './supabase';
import type { ClassementDivisionD2, EvolutionPoint } from './types';

/** Reproduit exactement getClassementDivisionD2() de DivisionD2Backend.gs :
 *  cumul journée par journée (parties jouées, victoires/défaites, points
 *  faits/rendus) et rang (victoires desc, puis diff desc, puis points faits
 *  desc) — approximation faute du barème de points de classement officiel
 *  FLBP, comme dans l'app d'origine. */
export async function getClassementDivisionD2(saison: string): Promise<ClassementDivisionD2> {
  const { data: matches, error } = await supabase
    .from('division_d2_resultats')
    .select('journee, club_a, club_b, points_a, points_b')
    .eq('saison', saison)
    .not('club_a', 'is', null)
    .not('club_b', 'is', null)
    .order('journee', { ascending: true });

  if (error) throw error;

  type Cumul = { joues: number; victoires: number; defaites: number; ptsFaits: number; ptsRendus: number };
  const clubsSet = new Set<string>();
  (matches ?? []).forEach((m) => {
    clubsSet.add(m.club_a as string);
    clubsSet.add(m.club_b as string);
  });
  const clubs = Array.from(clubsSet);

  const cumul: Record<string, Cumul> = {};
  clubs.forEach((c) => { cumul[c] = { joues: 0, victoires: 0, defaites: 0, ptsFaits: 0, ptsRendus: 0 }; });

  const journees = Array.from(new Set((matches ?? []).map((m) => m.journee as number))).sort((a, b) => a - b);

  const evolution: Record<string, EvolutionPoint[]> = {};
  clubs.forEach((c) => { evolution[c] = []; });

  journees.forEach((j) => {
    (matches ?? [])
      .filter((m) => m.journee === j)
      .forEach((m) => {
        const a = m.club_a as string, b = m.club_b as string;
        const ptsA = m.points_a as number, ptsB = m.points_b as number;
        cumul[a].joues++; cumul[b].joues++;
        cumul[a].ptsFaits += ptsA; cumul[a].ptsRendus += ptsB;
        cumul[b].ptsFaits += ptsB; cumul[b].ptsRendus += ptsA;
        if (ptsA > ptsB) { cumul[a].victoires++; cumul[b].defaites++; }
        else if (ptsB > ptsA) { cumul[b].victoires++; cumul[a].defaites++; }
      });

    const classementJournee = clubs
      .map((c) => ({ club: c, ...cumul[c], diff: cumul[c].ptsFaits - cumul[c].ptsRendus }))
      .sort((x, y) => y.victoires - x.victoires || y.diff - x.diff || y.ptsFaits - x.ptsFaits);

    classementJournee.forEach((entree, index) => {
      evolution[entree.club].push({
        journee: j,
        rang: index + 1,
        joues: cumul[entree.club].joues,
        victoires: cumul[entree.club].victoires,
        defaites: cumul[entree.club].defaites,
        ptsFaits: cumul[entree.club].ptsFaits,
        ptsRendus: cumul[entree.club].ptsRendus,
        diff: entree.diff,
      });
    });
  });

  const classementFinal = clubs
    .map((c) => ({ club: c, ...cumul[c], diff: cumul[c].ptsFaits - cumul[c].ptsRendus }))
    .sort((x, y) => y.victoires - x.victoires || y.diff - x.diff || y.ptsFaits - x.ptsFaits)
    .map((e, i) => ({ ...e, rang: i + 1 }));

  return { saison, journees, clubs, evolution, classementFinal };
}

export async function getSaisonsDisponiblesDivisionD2(): Promise<string[]> {
  const { data, error } = await supabase.from('division_d2_resultats').select('saison');
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.saison as string))).sort();
}

export type RencontreD2 = {
  journee: number;
  date: string;
  domicile: boolean | null;
  adversaire: string | null;
  scoreCM: number | null;
  scoreAdverse: number | null;
  statut: string;
};

export async function getRencontresD2(saison: string): Promise<RencontreD2[]> {
  const { data, error } = await supabase
    .from('rencontres_d2')
    .select('journee, date, domicile, club_adverse, score_cm, score_adverse, statut')
    .eq('saison', saison)
    .order('journee', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    journee: r.journee as number,
    date: r.date as string,
    domicile: r.domicile as boolean | null,
    adversaire: r.club_adverse as string | null,
    scoreCM: r.score_cm as number | null,
    scoreAdverse: r.score_adverse as number | null,
    statut: r.statut as string,
  }));
}

export type EquipePromotion = {
  journee: number;
  date: string;
  numeroEquipe: number;
  categorie: string | null;
  type: string | null;
  joueurs: string[];
  partiesGagnees: number;
};

export async function getEquipesPromotion(saison: string): Promise<EquipePromotion[]> {
  const { data, error } = await supabase
    .from('promotion_equipes')
    .select('journee, date, numero_equipe, categorie, type, joueur_1, joueur_2, joueur_3, parties_gagnees')
    .eq('saison', saison)
    .order('journee', { ascending: true })
    .order('numero_equipe', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((e) => ({
    journee: e.journee as number,
    date: e.date as string,
    numeroEquipe: e.numero_equipe as number,
    categorie: e.categorie as string | null,
    type: e.type as string | null,
    joueurs: [e.joueur_1, e.joueur_2, e.joueur_3].filter((j): j is string => !!j),
    partiesGagnees: e.parties_gagnees as number,
  }));
}

export async function getSaisonsPromotionDisponibles(): Promise<string[]> {
  const { data, error } = await supabase.from('promotion_equipes').select('saison');
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.saison as string))).sort();
}

export type EvenementFederation = {
  date: string;
  dateFin: string;
  libelle: string;
  categorie: string;
  lieu: string | null;
  domicile: boolean | null;
};

export async function getCalendrierFederation(saison: string): Promise<EvenementFederation[]> {
  const { data, error } = await supabase
    .from('calendrier_federation')
    .select('date, date_fin, libelle, categorie, lieu, domicile')
    .eq('saison', saison)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    date: f.date as string,
    dateFin: (f.date_fin as string | null) ?? (f.date as string),
    libelle: f.libelle as string,
    categorie: (f.categorie as string | null) ?? 'Fédération',
    lieu: f.lieu as string | null,
    domicile: f.domicile as boolean | null,
  }));
}

export type ItemCalendrier = {
  date: string;
  dateFin: string;
  titre: string;
  categorie: string;
  lieu: string | null;
  domicile: boolean | null;
};

/** Port simplifié de getCalendrierUnifie() (CalendrierFederation.gs) : mêmes
 *  deux sources (rencontres D2 + calendrier fédération), triées
 *  chronologiquement — les manifestations internes du club (3ᵉ source côté
 *  Apps Script) sont hors périmètre de ce prototype, cf. CONTEXTE_PROJET.md. */
export function fusionnerCalendrier(
  rencontres: RencontreD2[],
  federation: EvenementFederation[]
): ItemCalendrier[] {
  const items: ItemCalendrier[] = [];
  rencontres
    .filter((r) => r.statut !== 'Exempt')
    .forEach((r) => {
      const titre = r.domicile
        ? `Carreau Mondorf — ${r.adversaire}`
        : `${r.adversaire} — Carreau Mondorf`;
      items.push({
        date: r.date,
        dateFin: r.date,
        titre,
        categorie: 'National D2',
        lieu: null,
        domicile: r.domicile,
      });
    });
  federation.forEach((f) => {
    items.push({
      date: f.date,
      dateFin: f.dateFin,
      titre: f.libelle,
      categorie: f.categorie,
      lieu: f.lieu,
      domicile: f.domicile,
    });
  });
  items.sort((a, b) => a.date.localeCompare(b.date));
  return items;
}
