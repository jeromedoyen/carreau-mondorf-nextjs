import type { SupabaseClient } from '@supabase/supabase-js';
import type { MesStatistiquesD2 } from './stats';
import type { PartieJoueurD2Enrichie, PointsJourneeD2 } from './types';

/* Agrégations du tableau de bord individuel (/moncaro).
 *
 * Règle tenue dans tout ce fichier : aucun indicateur n'est inventé. Chaque
 * champ se déduit des parties réellement enregistrées, et tout ce qui n'est
 * pas calculable vaut `null` plutôt qu'un zéro trompeur — un taux de
 * présence à 0 % et un taux de présence inconnu ne disent pas la même chose.
 *
 * Le calcul se fait en mémoire, sur quelques dizaines de lignes au plus (une
 * saison compte 12 rencontres et 4 parties par joueur) : ni cache ni
 * pré-calcul ne se justifient ici, ce serait de la complexité gratuite. */

export type BilanParType = {
  type: string;
  joues: number;
  victoires: number;
  tauxVictoire: number;
};

export type BilanParCamp = {
  camp: 'domicile' | 'exterieur';
  joues: number;
  victoires: number;
  tauxVictoire: number;
};

export type PartenaireD2 = {
  nom: string;
  joues: number;
  victoires: number;
  tauxVictoire: number;
};

/** Une rencontre vue par le joueur : ses parties à lui, plus le résultat
 *  collectif pour donner le contexte. */
export type RencontreDuJoueur = {
  idRencontre: number;
  journee: number;
  date: string;
  adversaireClub: string | null;
  domicile: boolean | null;
  scoreRencontreCM: number | null;
  scoreRencontreAdverse: number | null;
  parties: PartieJoueurD2Enrichie[];
  joues: number;
  victoires: number;
  points: number;
};

export type BilanSportifD2 = {
  joues: number;
  victoires: number;
  /** Pas de match nul en pétanque : une partie se joue en 13 points, il y a
   *  toujours un vainqueur. Vérifié sur l'intégralité des parties
   *  enregistrées — `defaites` est donc exactement `joues - victoires`. */
  defaites: number;
  tauxVictoire: number;
  pointsTotal: number;
  journeesJouees: number;
  /** Rencontres que l'équipe a disputées dans la saison, hors journées où
   *  elle était exempte. Dénominateur du taux de présence. */
  rencontresEquipe: number | null;
  /** journeesJouees / rencontresEquipe. `null` si le dénominateur est
   *  inconnu — on préfère ne rien afficher qu'un pourcentage faux. */
  tauxPresence: number | null;
  parType: BilanParType[];
  parCamp: BilanParCamp[];
  meilleureSerie: number;
  serieEnCours: number;
  pointsParJournee: PointsJourneeD2[];
  partenaires: PartenaireD2[];
  rencontres: RencontreDuJoueur[];
};

const taux = (victoires: number, joues: number) => (joues > 0 ? victoires / joues : 0);

/** Ordre chronologique de jeu : par date, puis par phase, puis par le rang
 *  porté sur la feuille de match. Pour un joueur donné, (journée, phase)
 *  suffit déjà à lever toute ambiguïté — le règlement ne l'aligne qu'une
 *  fois par phase — mais trier aussi sur `ordre` rend le résultat
 *  indépendant de l'ordre de lecture en base. */
function ordreDeJeu(a: PartieJoueurD2Enrichie, b: PartieJoueurD2Enrichie): number {
  return (
    a.date.localeCompare(b.date) ||
    a.phase - b.phase ||
    (a.ordre ?? 0) - (b.ordre ?? 0)
  );
}

/** Plus longue suite de victoires consécutives, et suite en cours à la fin
 *  de la saison enregistrée. Les parties sont parcourues dans l'ordre où
 *  elles ont été jouées. */
function calculerSeries(partiesChronologiques: PartieJoueurD2Enrichie[]): {
  meilleureSerie: number;
  serieEnCours: number;
} {
  let meilleure = 0;
  let courante = 0;
  for (const p of partiesChronologiques) {
    courante = p.gagne ? courante + 1 : 0;
    if (courante > meilleure) meilleure = courante;
  }
  return { meilleureSerie: meilleure, serieEnCours: courante };
}

export function construireBilanSportifD2(
  stats: MesStatistiquesD2,
  rencontresEquipe: number | null
): BilanSportifD2 {
  const parties = stats.parties;
  const chronologiques = [...parties].sort(ordreDeJeu);

  const parType: BilanParType[] = Object.entries(stats.parType)
    .map(([type, t]) => ({
      type,
      joues: t.joues,
      victoires: t.victoires,
      tauxVictoire: taux(t.victoires, t.joues),
    }))
    .sort((a, b) => b.joues - a.joues);

  // Le camp n'est connu que si la rencontre le porte : une partie sans
  // `domicile` n'est comptée d'aucun côté plutôt que rangée par défaut.
  const camps: BilanParCamp[] = (['domicile', 'exterieur'] as const)
    .map((camp) => {
      const duCamp = parties.filter((p) =>
        p.domicile === null ? false : camp === 'domicile' ? p.domicile : !p.domicile
      );
      const victoires = duCamp.filter((p) => p.gagne).length;
      return { camp, joues: duCamp.length, victoires, tauxVictoire: taux(victoires, duCamp.length) };
    })
    .filter((c) => c.joues > 0);

  const parPartenaire = new Map<string, { joues: number; victoires: number }>();
  parties.forEach((p) => {
    p.partenaires.forEach((nom) => {
      const cumul = parPartenaire.get(nom) ?? { joues: 0, victoires: 0 };
      cumul.joues++;
      if (p.gagne) cumul.victoires++;
      parPartenaire.set(nom, cumul);
    });
  });
  const partenaires: PartenaireD2[] = Array.from(parPartenaire.entries())
    .map(([nom, c]) => ({ nom, ...c, tauxVictoire: taux(c.victoires, c.joues) }))
    .sort((a, b) => b.joues - a.joues || b.tauxVictoire - a.tauxVictoire);

  const parRencontre = new Map<number, RencontreDuJoueur>();
  chronologiques.forEach((p) => {
    let r = parRencontre.get(p.idRencontre);
    if (!r) {
      r = {
        idRencontre: p.idRencontre,
        journee: p.journee,
        date: p.date,
        adversaireClub: p.adversaireClub,
        domicile: p.domicile,
        scoreRencontreCM: p.scoreRencontreCM,
        scoreRencontreAdverse: p.scoreRencontreAdverse,
        parties: [],
        joues: 0,
        victoires: 0,
        points: 0,
      };
      parRencontre.set(p.idRencontre, r);
    }
    r.parties.push(p);
    r.joues++;
    if (p.gagne) r.victoires++;
    r.points += p.points;
  });
  const rencontres = Array.from(parRencontre.values()).sort((a, b) => b.journee - a.journee);

  const journeesJouees = new Set(parties.map((p) => p.journee)).size;
  const { meilleureSerie, serieEnCours } = calculerSeries(chronologiques);

  return {
    joues: stats.joues,
    victoires: stats.victoires,
    defaites: stats.joues - stats.victoires,
    tauxVictoire: stats.tauxVictoire,
    pointsTotal: stats.pointsTotal,
    journeesJouees,
    rencontresEquipe,
    tauxPresence:
      rencontresEquipe && rencontresEquipe > 0 ? journeesJouees / rencontresEquipe : null,
    parType,
    parCamp: camps,
    meilleureSerie,
    serieEnCours,
    pointsParJournee: stats.pointsParJournee,
    partenaires,
    rencontres,
  };
}

/** Nombre de rencontres effectivement disputées par l'équipe sur la saison
 *  (RPC `rencontres_jouees_saison`, migration 0062). `null` si la migration
 *  n'est pas encore appliquée : le taux de présence disparaît alors de
 *  l'écran, il ne s'affiche pas faux. */
export async function getRencontresJoueesSaison(
  supabase: SupabaseClient,
  saison: string
): Promise<number | null> {
  const { data, error } = await supabase.rpc('rencontres_jouees_saison', { p_saison: saison });
  if (error || typeof data !== 'number') return null;
  return data;
}

export type Distinction = {
  libelle: string;
  detail: string;
};

/** Distinctions strictement méritées, jamais décoratives : chacune est la
 *  lecture littérale d'un chiffre, et disparaît si ce chiffre ne la porte
 *  plus. Trois au maximum, pour qu'elles gardent leur valeur. */
export function calculerDistinctions(bilan: BilanSportifD2): Distinction[] {
  const distinctions: Distinction[] = [];

  if (
    bilan.rencontresEquipe !== null &&
    bilan.rencontresEquipe > 1 &&
    bilan.journeesJouees === bilan.rencontresEquipe
  ) {
    distinctions.push({
      libelle: 'Toutes les journées',
      detail: `Présent aux ${bilan.rencontresEquipe} rencontres de la saison`,
    });
  }

  if (bilan.meilleureSerie >= 4) {
    distinctions.push({
      libelle: `Série de ${bilan.meilleureSerie}`,
      detail: `${bilan.meilleureSerie} victoires d'affilée`,
    });
  }

  // Seuil volontairement haut, et exigeant un échantillon : un 100 % sur
  // deux parties ne dit rien.
  if (bilan.joues >= 8 && bilan.tauxVictoire >= 0.7) {
    distinctions.push({
      libelle: `${Math.round(bilan.tauxVictoire * 100)} % de victoires`,
      detail: `${bilan.victoires} parties gagnées sur ${bilan.joues}`,
    });
  }

  return distinctions.slice(0, 3);
}

/** Phrase de résumé de l'en-tête. Toujours dérivée des chiffres, jamais
 *  élogieuse par défaut : sans partie jouée, elle n'existe pas plutôt que
 *  de féliciter dans le vide. */
export function resumeSaison(bilan: BilanSportifD2 | null): string | null {
  if (!bilan || bilan.joues === 0) return null;

  const base = `${bilan.victoires} ${bilan.victoires > 1 ? 'parties gagnées' : 'partie gagnée'} sur ${bilan.joues}`;
  const journees = `${bilan.journeesJouees} ${bilan.journeesJouees > 1 ? 'journées' : 'journée'}`;

  if (bilan.meilleureSerie >= 4) {
    return `${base}, en ${journees}, avec une série de ${bilan.meilleureSerie} victoires d'affilée.`;
  }
  return `${base}, en ${journees} de championnat.`;
}
