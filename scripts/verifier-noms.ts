/**
 * Banc d'essai de la règle d'écriture d'un nom de participant
 * (`src/lib/tournoi/noms.ts`), celle que partagent l'écran et l'action
 * `renommerParticipant()`.
 *
 *   npx tsx scripts/verifier-noms.ts
 */

import { NOM_PARTICIPANT_MAX, verifierNomParticipant } from '../src/lib/tournoi/noms';

let echecs = 0;
function verifier(libelle: string, ok: boolean, detail?: unknown) {
  if (ok) console.log(`  ok   ${libelle}`);
  else {
    echecs++;
    console.log(`  ECHEC ${libelle}`, detail ?? '');
  }
}

function attendNom(saisie: string, attendu: string, libelle: string) {
  const v = verifierNomParticipant(saisie);
  verifier(libelle, v.ok && v.nom === attendu, v);
}

function attendRefus(saisie: string, libelle: string) {
  const v = verifierNomParticipant(saisie);
  verifier(libelle, !v.ok && v.error.length > 0, v);
}

console.log('Nom accepté, nettoyé sans être « corrigé »');
attendNom('Dominique Rousset', 'Dominique Rousset', 'nom simple inchangé');
attendNom('  Dominique   Rousset  ', 'Dominique Rousset', 'espaces autour et multiples ramenés à un seul');
attendNom('Dominique Rousset', 'Dominique Rousset', 'espace insécable ramenée à une espace');
attendNom('Dominique\nRousset', 'Dominique Rousset', 'retour à la ligne ramené à une espace');
attendNom('ROUSSET Dominique', 'ROUSSET Dominique', "la casse et l'ordre prénom / nom ne sont pas touchés");
attendNom('Jean-Pierre D’Aoust', 'Jean-Pierre D’Aoust', 'tiret et apostrophe typographique conservés');
attendNom('Ren' + 'é' + 'e', 'Renée', 'accent décomposé (e + accent) recomposé en un seul caractère (NFC)');
attendNom('X'.repeat(NOM_PARTICIPANT_MAX), 'X'.repeat(NOM_PARTICIPANT_MAX), `${NOM_PARTICIPANT_MAX} caractères : accepté`);

console.log('Nom refusé');
attendRefus('', 'vide');
attendRefus('   ', 'espaces seulement');
attendRefus('\n\t', 'retours et tabulations seulement');
attendRefus('X'.repeat(NOM_PARTICIPANT_MAX + 1), `${NOM_PARTICIPANT_MAX + 1} caractères : trop long`);

if (echecs > 0) {
  console.log(`\n${echecs} échec(s).`);
  process.exit(1);
}
console.log('\nToutes les vérifications passent.');
