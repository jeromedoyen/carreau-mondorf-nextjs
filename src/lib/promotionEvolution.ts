import type { ClassementPromotion } from './data';

/** La situation d'un club à l'issue d'une journée de Promotion. */
export type PointEvolutionPromotion = {
  journee: number;
  rang: number;
  points: number;
  rencontres: number;
  /** Vrai si le rang vient d'un classement publié par la FLBP ; faux s'il
   *  est estimé aux points. */
  officiel: boolean;
  /** Nombre de 4/4 cumulé : celui de la FLBP sur ses classements publiés, reconstitué
   *  d'après les feuilles de journée ailleurs (voir `quatreQuatreReconstitue`).
   *  `null` pour une saison dont les feuilles n'ont pas été relevées. */
  quatreQuatre: number | null;
  /** Vrai si `quatreQuatre` vient des feuilles de journée et non d'un classement publié. */
  quatreQuatreReconstitue: boolean;
};

export type EvolutionPromotion = {
  journees: number[];
  clubs: string[];
  evolution: Record<string, PointEvolutionPromotion[]>;
  journeesOfficielles: number[];
};

/** Reconstitue le classement de la Promotion à chaque journée, pour le
 *  graphique d'évolution — le pendant de `getClassementDivisionD2()` côté
 *  National.
 *
 *  Deux sortes de journées :
 *
 *  - celles où la FLBP a **publié** un classement (`promotion_classement`) :
 *    on reprend ses positions telles quelles. Elles départagent les égalités
 *    au nombre de 4/4. La règle est reconstituée (journal du 08/10/2026), mais
 *    le décompte fédéral s'en écarte deux fois : positions reprises telles
 *    quelles (voir migration 0066) ;
 *  - les autres : rang **estimé** aux points cumulés, puis, à égalité, au
 *    nombre de 4/4 reconstitué (migration 0075). Le décompte repart du dernier
 *    classement publié : l'écart entre le compteur fédéral et la reconstitution
 *    (Boule d'Or, Clair-Chêne) est reporté tel quel sur les journées suivantes,
 *    pour que le nombre affiché ne recule pas d'une journée à l'autre. Si les
 *    4/4 restent égaux, l'ordre de la journée précédente est conservé — un club
 *    ne bouge que s'il a une raison de bouger. C'est une approximation, et elle
 *    est signalée comme telle à l'écran.
 *
 *  Un club qui ne joue pas une journée garde ses points ; il est classé
 *  quand même, comme sur les documents fédéraux (Kayl, 3 journées sur 10). */
export function construireEvolutionPromotion(data: ClassementPromotion): EvolutionPromotion {
  const { classements, resultats } = data;
  const journees = Array.from(new Set(resultats.map((r) => r.journee))).sort((a, b) => a - b);
  const clubs = Array.from(new Set(resultats.map((r) => r.club)));
  const officielParJournee = new Map(classements.map((c) => [c.apresJournee, c]));

  const cumul: Record<string, { points: number; rencontres: number }> = {};
  clubs.forEach((c) => {
    cumul[c] = { points: 0, rencontres: 0 };
  });
  const evolution: Record<string, PointEvolutionPromotion[]> = {};
  clubs.forEach((c) => {
    evolution[c] = [];
  });

  // Le 4/4 par journée n'existe que pour les saisons dont les feuilles ont été
  // relevées : sans lui, on retombe sur l'estimation aux seuls points.
  const jouees = resultats.filter((r) => r.jouee);
  const quatreQuatreConnu = jouees.length > 0 && jouees.every((r) => r.quatreQuatre !== null);
  const q4Reconstitue: Record<string, number> = {};
  const q4Decalage: Record<string, number> = {};
  clubs.forEach((c) => {
    q4Reconstitue[c] = 0;
    q4Decalage[c] = 0;
  });
  const q4 = (club: string) => q4Reconstitue[club] + q4Decalage[club];

  let ordrePrecedent = [...clubs];

  journees.forEach((j) => {
    resultats
      .filter((r) => r.journee === j && r.jouee)
      .forEach((r) => {
        cumul[r.club].points += r.points ?? 0;
        cumul[r.club].rencontres += 1;
        if (quatreQuatreConnu) q4Reconstitue[r.club] += r.quatreQuatre ?? 0;
      });

    const publie = officielParJournee.get(j);
    let ordre: string[];
    if (publie) {
      ordre = [...publie.lignes].sort((a, b) => a.position - b.position).map((l) => l.club);
      // Un club absent du classement publié (jamais vu, mais on ne plante
      // pas pour ça) est rangé à la fin, dans l'ordre précédent.
      ordrePrecedent.filter((c) => !ordre.includes(c)).forEach((c) => ordre.push(c));
      // Nouveau point d'ancrage du décompte pour les journées estimées qui suivent.
      if (quatreQuatreConnu) {
        publie.lignes.forEach((l) => {
          if (l.club in q4Reconstitue) q4Decalage[l.club] = l.quatreQuatre - q4Reconstitue[l.club];
        });
      }
    } else {
      const rangPrecedent = new Map(ordrePrecedent.map((c, i) => [c, i]));
      ordre = [...clubs].sort(
        (a, b) =>
          cumul[b].points - cumul[a].points ||
          (quatreQuatreConnu ? q4(b) - q4(a) : 0) ||
          (rangPrecedent.get(a) ?? 0) - (rangPrecedent.get(b) ?? 0)
      );
    }

    ordre.forEach((club, index) => {
      const ligne = publie?.lignes.find((l) => l.club === club);
      evolution[club].push({
        journee: j,
        rang: index + 1,
        points: ligne ? ligne.points : cumul[club].points,
        rencontres: ligne ? ligne.rencontresJouees : cumul[club].rencontres,
        officiel: !!ligne,
        quatreQuatre: ligne ? ligne.quatreQuatre : quatreQuatreConnu ? q4(club) : null,
        quatreQuatreReconstitue: !ligne && quatreQuatreConnu,
      });
    });
    ordrePrecedent = ordre;
  });

  return {
    journees,
    clubs,
    evolution,
    journeesOfficielles: classements.map((c) => c.apresJournee).filter((j) => journees.includes(j)),
  };
}
