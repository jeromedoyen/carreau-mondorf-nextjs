import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { ClassementDivisionD2, EvolutionPoint } from './types';

/** Montant de la cotisation annuelle affiché sur la page publique /club
 *  (29/07/2026, demande Jérôme : plus aucun montant en dur dans le code —
 *  toujours celui configuré par le CA sur Outils → Appel à cotisation).
 *  RPC dédiée (montants_club(), migration 0042) : parametres_club n'est
 *  lisible par un anonyme via aucune policy directe. */
export async function getMontantCotisation(): Promise<number | null> {
  // Ne jamais relancer l'erreur : /club est prérendue au build, et un throw ici
  // faisait échouer la compilation ENTIÈRE dès que Supabase était injoignable
  // (constaté en continu sur les previews Vercel, dont la base de test a été
  // supprimée le 25/08/2026). La page gère déjà `null` — elle affiche alors
  // « Montant fixé annuellement par le comité — nous contacter ». Un montant
  // d'affichage optionnel ne doit pas pouvoir casser un déploiement.
  try {
    const { data, error } = await supabase.rpc('montants_club');
    if (error) throw error;
    const ligne = (data as { montant_carte_membre: number | null }[] | null)?.[0];
    return ligne?.montant_carte_membre ?? null;
  } catch {
    return null;
  }
}

/** Classement de la division, cumulé journée par journée.
 *
 *  Le **barème officiel FLBP est désormais connu** : 2 points par victoire,
 *  1 point par défaite — déduit du classement publié par la fédération à
 *  l'issue de la J12 (04/09/2026) et vérifié sur les sept clubs. Il remplace
 *  l'approximation héritée de `DivisionD2Backend.gs`, qui triait sur le seul
 *  nombre de victoires et donnait un ordre différent de l'officiel.
 *
 *  Le point de détail qui compte : une défaite rapporte 1 point, donc un club
 *  ayant joué une rencontre de plus peut devancer un club à égalité de
 *  victoires. C'est exactement le cas de KaBoule (11 j., 8 v., 19 pts) devant
 *  Carreau Mondorf (10 j., 8 v., 18 pts) — l'ancien tri plaçait Mondorf
 *  premier. Départage ensuite à la différence de points, puis aux points
 *  faits. */
/** Barème FLBP : 2 points par victoire, 1 par défaite. Les rencontres nulles
 *  n'existent pas dans ce championnat (le score total ne peut pas être à
 *  égalité), mais si le cas se présentait elles ne rapporteraient rien de
 *  plus qu'une défaite — on ne les compte donc pas à part. */
function pointsClassement(c: { victoires: number; defaites: number }): number {
  return c.victoires * 2 + c.defaites;
}

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
      .map((c) => ({
        club: c,
        ...cumul[c],
        diff: cumul[c].ptsFaits - cumul[c].ptsRendus,
        points: pointsClassement(cumul[c]),
      }))
      .sort((x, y) => y.points - x.points || y.diff - x.diff || y.ptsFaits - x.ptsFaits);

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
        points: entree.points,
      });
    });
  });

  const classementFinal = clubs
    .map((c) => ({
      club: c,
      ...cumul[c],
      diff: cumul[c].ptsFaits - cumul[c].ptsRendus,
      points: pointsClassement(cumul[c]),
    }))
    .sort((x, y) => y.points - x.points || y.diff - x.diff || y.ptsFaits - x.ptsFaits)
    .map((e, i) => ({ ...e, rang: i + 1 }));

  return { saison, journees, clubs, evolution, classementFinal };
}

export async function getSaisonsDisponiblesDivisionD2(): Promise<string[]> {
  const { data, error } = await supabase.from('division_d2_resultats').select('saison');
  if (error) throw error;
  return Array.from(new Set((data ?? []).map((r) => r.saison as string))).sort();
}

export type RencontreD2 = {
  id: number;
  journee: number;
  date: string;
  /** « National D2 », « National D1 » — la division de la rencontre
   *  (`rencontres_d2.division`), catégorie du calendrier unifié. */
  division: string;
  domicile: boolean | null;
  adversaire: string | null;
  scoreCM: number | null;
  scoreAdverse: number | null;
  statut: string;
};

/** Une seule rencontre par id — pour l'en-tête de la page de consultation
 *  (/national-d2/rencontres/[id]), publique comme le reste de `rencontres_d2`
 *  (seul le détail des parties, dans parties_d2, est restreint). */
export async function getRencontreD2ParId(id: number): Promise<RencontreD2 | null> {
  const { data, error } = await supabase
    .from('rencontres_d2')
    .select('id, journee, date, division, domicile, club_adverse, score_cm, score_adverse, statut')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id as number,
    journee: data.journee as number,
    date: data.date as string,
    division: (data.division as string | null) ?? 'National D2',
    domicile: data.domicile as boolean | null,
    adversaire: data.club_adverse as string | null,
    scoreCM: data.score_cm as number | null,
    scoreAdverse: data.score_adverse as number | null,
    statut: data.statut as string,
  };
}

export async function getRencontresD2(saison: string): Promise<RencontreD2[]> {
  const { data, error } = await supabase
    .from('rencontres_d2')
    .select('id, journee, date, division, domicile, club_adverse, score_cm, score_adverse, statut')
    .eq('saison', saison)
    .order('journee', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as number,
    journee: r.journee as number,
    date: r.date as string,
    division: (r.division as string | null) ?? 'National D2',
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

/** Client injecté (comme getStatistiquesJoueursD2/getStatistiquesPromotion,
 *  src/lib/stats.ts) : depuis 0007_verrouillage_promotion.sql, tout le
 *  module Promotion (calendrier + statistiques) est réservé aux licenciés
 *  connectés — l'appelant doit passer le client avec session. */
export async function getEquipesPromotion(
  supabase: SupabaseClient,
  saison: string
): Promise<EquipePromotion[]> {
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

/** Combien de journées de Promotion la saison compte-t-elle *réellement* —
 *  à distinguer du nombre de journées présentes dans `promotion_equipes`,
 *  qui ne contient que ce que la fédération a publié en détail.
 *
 *  L'écart entre les deux n'est pas un détail : en 2026 la FLBP n'a mis en
 *  ligne la composition des trios que pour 2 journées sur 10 (feuilles J6 et
 *  J10, cf. migration 0065), et en 2025 il en manquait déjà une. Sans ce
 *  dénominateur, « 2 journées jouées » se lit comme une saison entière.
 *
 *  Renvoie `null` quand le calendrier fédéral ne couvre pas la saison — on
 *  préfère taire le total plutôt que de le déduire du plus grand numéro de
 *  journée connu, qui n'en serait qu'une borne basse. */
export async function getNombreJourneesPromotion(saison: string): Promise<number | null> {
  const { data, error } = await supabase
    .from('calendrier_federation')
    .select('id')
    .eq('saison', saison)
    .eq('categorie', 'Promotion')
    .eq('supprime', false);
  if (error) throw error;
  return data && data.length > 0 ? data.length : null;
}

export type LigneClassementPromotion = {
  position: number;
  club: string;
  rencontresJouees: number;
  quatreQuatre: number;
  points: number;
};

/** Un classement tel que la FLBP l'a publié à l'issue d'une journée. */
export type ClassementPromotionPublie = {
  apresJournee: number;
  lignes: LigneClassementPromotion[];
};

export type ResultatJourneeClub = {
  journee: number;
  date: string;
  club: string;
  /** Distinct de « 0 point » : un club peut jouer et ne rien marquer. */
  jouee: boolean;
  points: number | null;
  /** Valeur calculée par différence entre deux classements, non publiée. */
  deduit: boolean;
};

export type ClassementPromotion = {
  classements: ClassementPromotionPublie[];
  resultats: ResultatJourneeClub[];
};

/** Classement des clubs en Promotion (migration 0066).
 *
 *  Les classements sont ceux que la fédération a publiés, pas un recalcul :
 *  le départage au nombre de « 4/4 » n'est publié que cumulé et sa règle
 *  exacte n'est écrite nulle part, on ne saurait pas le reconstituer.
 *
 *  Client injecté, comme `getEquipesPromotion` : les deux tables sont
 *  réservées aux utilisateurs autorisés, une lecture anonyme reviendrait
 *  vide. */
export async function getClassementPromotion(
  supabase: SupabaseClient,
  saison: string
): Promise<ClassementPromotion> {
  const [classementsRes, resultatsRes] = await Promise.all([
    supabase
      .from('promotion_classement')
      .select('apres_journee, position, club, rencontres_jouees, quatre_quatre, points')
      .eq('saison', saison)
      .order('apres_journee', { ascending: true })
      .order('position', { ascending: true }),
    supabase
      .from('promotion_resultats_club')
      .select('journee, date, club, jouee, points, deduit')
      .eq('saison', saison)
      .order('journee', { ascending: true }),
  ]);
  if (classementsRes.error) throw classementsRes.error;
  if (resultatsRes.error) throw resultatsRes.error;

  const parJournee = new Map<number, LigneClassementPromotion[]>();
  for (const c of classementsRes.data ?? []) {
    const j = c.apres_journee as number;
    if (!parJournee.has(j)) parJournee.set(j, []);
    parJournee.get(j)!.push({
      position: c.position as number,
      club: c.club as string,
      rencontresJouees: c.rencontres_jouees as number,
      quatreQuatre: c.quatre_quatre as number,
      points: c.points as number,
    });
  }

  return {
    classements: Array.from(parJournee.entries()).map(([apresJournee, lignes]) => ({
      apresJournee,
      lignes,
    })),
    resultats: (resultatsRes.data ?? []).map((r) => ({
      journee: r.journee as number,
      date: r.date as string,
      club: r.club as string,
      jouee: r.jouee as boolean,
      points: r.points as number | null,
      deduit: r.deduit as boolean,
    })),
  };
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
    .eq('supprime', false)
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

export type EvenementFederationAdmin = EvenementFederation & {
  id: number;
  concerneClub: boolean;
  notes: string | null;
};

/** Variante avec `id` pour l'écran de gestion CA (/federation) — la lecture
 *  publique (getCalendrierFederation ci-dessus) n'a pas besoin de l'id
 *  puisqu'elle ne fait qu'afficher. Passe par le même client public : la
 *  policy de lecture reste ouverte à tous (0001_init.sql), seule l'écriture
 *  est réservée au CA (0012_ecriture_federation.sql). */
export async function getCalendrierFederationAdmin(saison: string): Promise<EvenementFederationAdmin[]> {
  const { data, error } = await supabase
    .from('calendrier_federation')
    .select('id, date, date_fin, libelle, categorie, lieu, domicile, concerne_club, notes')
    .eq('saison', saison)
    .eq('supprime', false)
    .order('date', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((f) => ({
    id: f.id as number,
    date: f.date as string,
    dateFin: (f.date_fin as string | null) ?? (f.date as string),
    libelle: f.libelle as string,
    categorie: (f.categorie as string | null) ?? 'Fédération',
    lieu: f.lieu as string | null,
    domicile: f.domicile as boolean | null,
    concerneClub: !!f.concerne_club,
    notes: f.notes as string | null,
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

/** Port de getCalendrierUnifie() (CalendrierFederation.gs), complété le
 *  26/07/2026 (retour Jérôme : "il manque des visualisations calendrier
 *  claires... événements du club, concours, journées championnat mélangés
 *  avec les congés du CA — c'était clair en v1, ça l'est moins en v2") —
 *  fusionne désormais 4 sources au lieu de 2 : rencontres D2, calendrier
 *  fédération, manifestations internes du club, et congés CA. `manifestations`
 *  vient de getManifestations() (RLS "lecture licenciés" — vide si non
 *  connecté, pas d'erreur) et `conges` de getConges() (RLS "lecture CA" —
 *  vide si non-CA) : les deux se dégradent silencieusement selon qui
 *  regarde, pas besoin de vérifier le rôle ici. */
export function fusionnerCalendrier(
  rencontres: RencontreD2[],
  federation: EvenementFederation[],
  manifestations: { id: number; nom: string; dateDebut: string; dateFin: string; lieu: string | null; type: string | null }[] = [],
  conges: { id: number; personne: string; dateDebut: string; dateFin: string; motif: string | null }[] = []
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
        // La division de la rencontre, pas une constante : en 2027 ce sera
        // « National D1 », et les filtres du calendrier reconnaissent
        // toute catégorie « National D… » (voir estChampionnatNational).
        categorie: r.division,
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
  manifestations.forEach((m) => {
    items.push({
      date: m.dateDebut,
      dateFin: m.dateFin,
      titre: m.nom,
      categorie: m.type ?? 'Manifestation club',
      lieu: m.lieu,
      domicile: null,
    });
  });
  conges.forEach((c) => {
    items.push({
      date: c.dateDebut,
      dateFin: c.dateFin,
      titre: `${c.personne} — ${c.motif ?? 'Congé'}`,
      categorie: 'Congé CA',
      lieu: null,
      domicile: null,
    });
  });
  items.sort((a, b) => a.date.localeCompare(b.date));
  return items;
}
