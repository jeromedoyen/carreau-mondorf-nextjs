/** Avertissement de couverture partielle du module Promotion.
 *
 *  Pourquoi il existe : `promotion_equipes` ne contient que les journées
 *  dont on a la feuille, avec la composition des trios. En 2026 : J6 et J10
 *  publiées par la FLBP (0065), puis J1, J2, J3, J4, J7 et J9 transmises par
 *  Jérôme (0070) — 8 sur 10 ; en 2025 il en manquait déjà une. Le texte ne
 *  dit donc pas qui n'a pas publié : il dit ce qui manque. Or `StatistiquesPromotion` affiche une colonne
 *  « Journées jouées » : sans dénominateur, un licencié qui a fait presque
 *  toute la saison y lit « 2 » et croit à une erreur — ou pire, n'y voit
 *  rien d'anormal et prend le taux de victoire pour son bilan de l'année.
 *
 *  Le principe est celui déjà posé pour `ClassementBars` : une valeur ne
 *  doit jamais dépendre d'un survol ou d'une note de bas de page pour être
 *  comprise. Le contexte est affiché, en clair, au-dessus des chiffres.
 *
 *  Ne rend rien quand la couverture est complète, ou quand le total de la
 *  saison est inconnu (`getNombreJourneesPromotion` renvoie alors `null`) :
 *  mieux vaut se taire qu'annoncer une proportion devinée. */
export function CouvertureSaisonPromotion({
  journeesCouvertes,
  journeesSaison,
}: {
  journeesCouvertes: number[];
  journeesSaison: number | null;
}) {
  if (!journeesSaison || journeesCouvertes.length === 0) return null;

  // Dédoublonner AVANT de comparer : l'appelant passe une journée par
  // équipe, pas par journée. Comparée brute, la liste (32 équipes en 2026)
  // dépassait le total de la saison (10) et le bandeau disparaissait alors
  // qu'il manquait deux journées — défaut resté invisible tant qu'il n'y
  // avait que 5 équipes en base (constaté le 23/09/2026).
  const couvertes = [...new Set(journeesCouvertes)].sort((a, b) => a - b);
  if (couvertes.length >= journeesSaison) return null;
  const manquantes = Array.from({ length: journeesSaison }, (_, i) => i + 1).filter(
    (j) => !couvertes.includes(j)
  );

  // On cite la liste la plus courte des deux : « journées 6 et 10 » se lit,
  // « toutes sauf la 5 » aussi — neuf numéros à la suite, non.
  const citerManquantes = manquantes.length < couvertes.length;
  const liste = citerManquantes ? manquantes : couvertes;
  const enumeration =
    liste.length === 1
      ? `la journée ${liste[0]}`
      : `les journées ${liste.slice(0, -1).join(', ')} et ${liste[liste.length - 1]}`;

  return (
    <div
      role="note"
      className="rounded-2xl border border-ligne border-l-[3px] border-l-laiton bg-sable-carte px-5 py-4 text-[13px] leading-relaxed text-encre-douce"
    >
      <p className="m-0 mb-1 font-medium text-encre">
        Saison partielle — {couvertes.length} journée{couvertes.length > 1 ? 's' : ''} sur{' '}
        {journeesSaison}
      </p>
      <p className="m-0">
        {citerManquantes
          ? `La composition des équipes n'est pas connue pour ${enumeration}.`
          : `La composition des équipes n'est connue que pour ${enumeration}.`}{' '}
        {/* « les journées connues » et non « ces journées-là » : quand la
            phrase précédente cite les journées manquantes, « ces journées-là »
            les désignait, soit l'inverse du sens voulu. */}
        Les équipes et les statistiques individuelles ne portent que sur les journées connues :
        « journées jouées » compte celles-là, pas la saison entière. Le classement des clubs, lui,
        couvre toute la saison.
      </p>
    </div>
  );
}
