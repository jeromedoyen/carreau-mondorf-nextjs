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
  /** Nombre de 4/4, connu seulement sur les classements publiés. */
  quatreQuatre: number | null;
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
 *    au nombre de 4/4, un décompte que nous ne pouvons pas reconstituer
 *    (voir migration 0066) ;
 *  - les autres : rang **estimé** aux points cumulés. À égalité, l'ordre de
 *    la journée précédente est conservé — un club ne bouge que s'il a une
 *    raison de bouger. C'est une approximation, et elle est signalée comme
 *    telle à l'écran.
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

  let ordrePrecedent = [...clubs];

  journees.forEach((j) => {
    resultats
      .filter((r) => r.journee === j && r.jouee)
      .forEach((r) => {
        cumul[r.club].points += r.points ?? 0;
        cumul[r.club].rencontres += 1;
      });

    const publie = officielParJournee.get(j);
    let ordre: string[];
    if (publie) {
      ordre = [...publie.lignes].sort((a, b) => a.position - b.position).map((l) => l.club);
      // Un club absent du classement publié (jamais vu, mais on ne plante
      // pas pour ça) est rangé à la fin, dans l'ordre précédent.
      ordrePrecedent.filter((c) => !ordre.includes(c)).forEach((c) => ordre.push(c));
    } else {
      const rangPrecedent = new Map(ordrePrecedent.map((c, i) => [c, i]));
      ordre = [...clubs].sort(
        (a, b) =>
          cumul[b].points - cumul[a].points ||
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
        quatreQuatre: ligne ? ligne.quatreQuatre : null,
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
