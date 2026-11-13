/**
 * L'écriture du nom d'un participant de tournoi — la règle, en un seul endroit.
 *
 * Partagée par l'action serveur `renommerParticipant()` (qui a le dernier mot)
 * et par l'écran (qui prévient avant d'envoyer). Volontairement sans base ni
 * réseau, pour rester testable seule.
 */

/** Un nom plus long n'est pas un nom : c'est une erreur de collage. */
export const NOM_PARTICIPANT_MAX = 80;

export type VerdictNom = { ok: true; nom: string } | { ok: false; error: string };

/**
 * Nettoie et contrôle un nom saisi : espaces superflus (y compris insécables et
 * retours à la ligne) ramenés à une espace simple, accents recomposés, vide et
 * trop long refusés. Aucune autre « correction » : la casse et l'ordre
 * prénom / nom restent ceux que l'organisateur a tapés.
 */
export function verifierNomParticipant(saisie: string): VerdictNom {
  const nom = saisie.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (nom.length === 0) return { ok: false, error: 'Le nom ne peut pas être vide.' };
  if (nom.length > NOM_PARTICIPANT_MAX) {
    return { ok: false, error: `Le nom est trop long (${NOM_PARTICIPANT_MAX} caractères au plus).` };
  }
  return { ok: true, nom };
}
