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

/* ------------------------------------------------- équipes de clubs mixtes */

/**
 * Entre deux clubs d'une même équipe : « Kayl / Mondorf », « Kayl + Mondorf ».
 * Le tiret n'en fait pas partie : il se trouve dans des noms de club réels
 * (« Mondorf-les-Bains »).
 */
const SEPARATEUR_CLUBS = /\s*[/+&;]\s*/;

/**
 * Forme de comparaison d'UN club : sans accents ni casse, apostrophes
 * unifiées, et sans le « Carreau » du nom officiel du club — la feuille d'un
 * organisateur écrit « Mondorf », le club par défaut s'appelle « Carreau
 * Mondorf », et c'est le même club.
 */
function formeClub(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^carreau (?:boules et petanque )?(?=\S)/, '');
}

function jetons(club: string | null | undefined): { brut: string; cle: string }[] {
  const vus = new Set<string>();
  const sortie: { brut: string; cle: string }[] = [];
  for (const morceau of (club ?? '').split(SEPARATEUR_CLUBS)) {
    const brut = morceau.trim();
    const cle = formeClub(brut);
    if (!cle || vus.has(cle)) continue;
    vus.add(cle);
    sortie.push({ brut, cle });
  }
  return sortie;
}

/**
 * Les clubs d'une équipe, sous leur forme de comparaison — plusieurs quand
 * l'équipe réunit des joueurs de deux clubs (« Kayl / Mondorf »). Vide = club
 * inconnu.
 */
export function clesClub(club: string | null | undefined): string[] {
  return jetons(club).map((j) => j.cle);
}

/**
 * Ce que deux équipes ont en commun côté club, écrit comme chez `a`, ou `null`.
 * Deux équipes de clubs mixtes se rencontrent dès qu'un seul club leur est
 * commun : « Kayl / Mondorf » contre « Mondorf » est une rencontre de même club.
 */
export function clubEnCommun(
  a: string | null | undefined,
  b: string | null | undefined,
): string | null {
  const cb = new Set(clesClub(b));
  const communs = jetons(a).filter((j) => cb.has(j.cle));
  return communs.length > 0 ? communs.map((j) => j.brut).join(' / ') : null;
}

/**
 * Club d'une équipe d'après celui de chacun de ses membres : les clubs distincts,
 * dans l'ordre. Deux joueurs de « Belvaux » → « Belvaux » ; un de « Kayl » et un
 * de « Mondorf » → « Kayl / Mondorf ». Aucun club saisi → `null`.
 */
export function clubDeEquipe(clubsMembres: (string | null | undefined)[]): string | null {
  const vus = new Set<string>();
  const sortie: string[] = [];
  for (const c of clubsMembres) {
    for (const j of jetons(c)) {
      if (vus.has(j.cle)) continue;
      vus.add(j.cle);
      sortie.push(j.brut);
    }
  }
  return sortie.length > 0 ? sortie.join(' / ') : null;
}
