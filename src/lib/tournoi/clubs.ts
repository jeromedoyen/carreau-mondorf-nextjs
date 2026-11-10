/**
 * Le club d'une équipe de tournoi — la règle, en un seul endroit.
 *
 * Sert aux deux moteurs : le tirage des poules (`poules.ts`) et la première
 * partie des équipes fixes (`moteur.ts`). Volontairement sans base ni réseau,
 * pour rester testable seul.
 */

/** Club supposé d'une équipe composée uniquement de licenciés du club. */
export const CLUB_PAR_DEFAUT = 'Carreau Mondorf';

/**
 * Forme de comparaison d'un club : sans casse ni espaces autour. « Mondorf » et
 * « mondorf » sont le même club ; vide ou absent = club inconnu (`null`), qui
 * ne compte jamais comme « même club » qu'une autre équipe.
 */
export function cleClub(club: string | null | undefined): string | null {
  const c = club?.trim().toLowerCase();
  return c ? c : null;
}

/**
 * Club d'une équipe : celui qui a été saisi, sinon — si tous ses membres sont
 * des licenciés du club — le club par défaut. Une équipe qui compte un invité
 * reste « inconnue » tant qu'on ne tape rien : un invité peut venir d'ailleurs.
 */
export function clubEffectif(
  saisi: string | null | undefined,
  membres: number[],
  estLicencie: (participantId: number) => boolean,
): string | null {
  const s = saisi?.trim();
  if (s) return s;
  return membres.length > 0 && membres.every(estLicencie) ? CLUB_PAR_DEFAUT : null;
}
