/** Normalisation de chaînes — point unique pour les variantes de
 *  `sansAccents()` qui étaient dupliquées dans stats.ts, actions/assistant.ts
 *  et quatre composants (regroupées le 03/08/2026).
 *
 *  Deux fonctions volontairement distinctes plutôt qu'une seule paramétrée :
 *  la casse de sortie n'est pas un détail cosmétique ici. `cleNomMajuscules()`
 *  sert de **clé de regroupement** des statistiques joueurs (D2 et Promotion) ;
 *  changer sa casse ne casserait rien visiblement mais fausserait les
 *  agrégats. Des noms explicites évitent qu'on les interchange par mégarde.
 *
 *  Le rapprochement flou d'un nom dicté vit ailleurs : `normaliserNom()`
 *  (fuzzyMatch.ts), qui neutralise en plus la ponctuation. */

/** Casse et accents neutralisés, espaces de bord retirés. Pour comparer deux
 *  noms saisis à la main ou filtrer un texte libre. */
export function sansAccentsMinuscules(texte: string): string {
  return String(texte || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Clé de rapprochement d'un nom de joueur **insensible à l'ordre** des
 *  mots : « Marie-Louise SCHMIT » et « SCHMIT Marie-Louise » donnent la même
 *  chose. Les tables de résultats écrivent le nom de famille en premier
 *  (`parties_d2.joueurs_cm`, `promotion_equipes.joueur_*`), le registre
 *  l'écrit en dernier (`personnes.prenom || ' ' || nom`) : sans cette clé,
 *  un licencié ne se retrouve jamais dans ses propres statistiques.
 *
 *  Les mots sont triés plutôt que découpés en prénom/nom, parce qu'aucune
 *  heuristique de découpage ne survit à « José Antonio MARTINS » ou « Yann
 *  LE BERRE ». La ponctuation devient une coupure de mot, donc le trait
 *  d'union de « Marie-Louise » est sans effet des deux côtés.
 *
 *  ⚠️ Jumelle exacte de la fonction SQL `public.cle_nom_joueur()` (migration
 *  0061), qui fait le même rapprochement côté base pour `mes_parties_d2()`.
 *  Toute modification de l'une doit être reportée sur l'autre, sans quoi un
 *  joueur serait retrouvé d'un côté et pas de l'autre. */
export function cleNomJoueur(texte: string): string {
  return String(texte || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .sort()
    .join(' ');
}

/** Port de `sansAccents_()` (ChampionnatBackend.gs, projet v1) : clé de
 *  regroupement insensible à la casse et aux accents, pour fusionner les
 *  variantes d'écriture d'un même joueur ("BACK Yves" vs "Back Yves").
 *
 *  ⚠️ Sortie en MAJUSCULES et sans `trim()` — c'est le comportement historique
 *  dont dépendent les statistiques D2/Promotion. Ne pas « harmoniser » avec
 *  `sansAccentsMinuscules()` : les clés changeraient de forme et les
 *  regroupements de joueurs avec elles. */
export function cleNomMajuscules(texte: string): string {
  return String(texte || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}
