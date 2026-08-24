/**
 * Banc d'essai de la lecture des listes de participants
 * (`src/lib/tournoi/import.ts`).
 *
 * Chaque club tape sa liste comme il veut : avec ou sans en-tête, une ligne par
 * équipe ou une ligne par joueur, numéros « 3 », « 3) » ou « Équipe 3 ». C'est
 * la partie la plus fragile de l'import, donc celle qu'on épingle par des cas
 * concrets — dont la vraie liste manuscrite du tournoi du 23/08.
 *
 *   npx tsx scripts/verifier-import-tournoi.ts
 */

import { analyserTableau, analyserTexte, lireCsv } from '../src/lib/tournoi/import';

let echecs = 0;

function verifier(libelle: string, condition: boolean, detail?: string) {
  if (!condition) echecs++;
  console.log(`  ${condition ? 'OK  ' : 'ÉCHEC'} ${libelle}${!condition && detail ? ` — ${detail}` : ''}`);
}

function resume(entrees: { nom: string; equipeDepart: number | null }[]) {
  return entrees.map((e) => `${e.equipeDepart ?? '-'}:${e.nom}`).join(' ');
}

console.log('\n=== Disposition large : une ligne par équipe ===');
{
  const r = analyserTableau([
    ['Équipe', 'Joueur 1', 'Joueur 2', 'Joueur 3'],
    ['1', 'Thinnes Pierre', 'Monique Thill', 'Faber Roger'],
    ['2', 'Cattazzo Rosy', 'Cattazzo Roby', 'Duren Romain'],
  ]);
  verifier('en-tête détecté', r.enTeteDetecte);
  verifier('disposition large', r.disposition === 'large', r.disposition);
  verifier('6 joueurs', r.entrees.length === 6, String(r.entrees.length));
  verifier('équipes 1 et 2 attribuées', resume(r.entrees).startsWith('1:Thinnes Pierre 1:Monique Thill 1:Faber Roger 2:'));
}

console.log('\n=== Disposition longue : une ligne par joueur ===');
{
  const r = analyserTableau([
    ['Nom', 'Prénom', 'Équipe'],
    ['THINNES', 'Pierre', '1'],
    ['THILL', 'Monique', '1'],
    ['CATTAZZO', 'Rosy', '2'],
  ]);
  verifier('disposition longue', r.disposition === 'longue', r.disposition);
  verifier('prénom placé avant le nom', r.entrees[0].nom === 'Pierre THINNES', r.entrees[0]?.nom);
  verifier('équipes lues', resume(r.entrees) === '1:Pierre THINNES 1:Monique THILL 2:Rosy CATTAZZO', resume(r.entrees));
}

console.log('\n=== Sans en-tête, numéros « 3) » (la vraie liste du 23/08) ===');
{
  const r = analyserTexte(
    `1) Thinnes Pierre, Monique Thill, Faber Roger
2) Cattazzo Rosy, Cattazzo Roby, Duren Romain
9) Hebisch Jemp
12) Jérôme, Marc, Jean`,
  );
  verifier('pas d\'en-tête', !r.enTeteDetecte);
  verifier('disposition large', r.disposition === 'large', r.disposition);
  verifier('10 joueurs', r.entrees.length === 10, String(r.entrees.length));
  verifier('numéro 9 conservé pour l\'équipe incomplète',
    r.entrees.filter((e) => e.equipeDepart === 9).length === 1 && r.entrees.some((e) => e.nom === 'Hebisch Jemp'));
  verifier('numéro 12 conservé', r.entrees.filter((e) => e.equipeDepart === 12).length === 3);
}

console.log('\n=== Numéros écrits « Équipe 3 » / « éq. 4 » ===');
{
  const r = analyserTexte(`Équipe 3, Mahnen Jeanny, Duren Raymonde
éq. 4, Godart Germaine, Godart Malou`);
  verifier('« Équipe 3 » reconnu', r.entrees.filter((e) => e.equipeDepart === 3).length === 2, resume(r.entrees));
  verifier('« éq. 4 » reconnu', r.entrees.filter((e) => e.equipeDepart === 4).length === 2, resume(r.entrees));
}

console.log('\n=== Sans numéro : équipes numérotées dans l\'ordre ===');
{
  const r = analyserTexte(`Thinnes Pierre, Monique Thill
Cattazzo Rosy, Cattazzo Roby`);
  verifier('équipes 1 puis 2 attribuées implicitement',
    resume(r.entrees) === '1:Thinnes Pierre 1:Monique Thill 2:Cattazzo Rosy 2:Cattazzo Roby', resume(r.entrees));
}

console.log('\n=== Liste plate de joueurs (mêlée) ===');
{
  const r = analyserTexte(`Thinnes Pierre
Monique Thill
Faber Roger`);
  verifier('disposition colonne simple', r.disposition === 'colonne-simple', r.disposition);
  verifier('aucun numéro d\'équipe', r.entrees.every((e) => e.equipeDepart === null));
  verifier('3 joueurs', r.entrees.length === 3, String(r.entrees.length));
}

console.log('\n=== Bruit : lignes vides, totaux, séparateurs ===');
{
  const r = analyserTableau([
    ['Équipe', 'Joueur 1', 'Joueur 2'],
    ['1', 'Thinnes Pierre', 'Monique Thill'],
    ['', '', ''],
    ['', '—', ''],
    ['Total', '', ''],
    ['2', 'Cattazzo Rosy', 'Cattazzo Roby'],
  ]);
  verifier('4 joueurs retenus', r.entrees.length === 4, resume(r.entrees));
  verifier('lignes parasites comptées comme ignorées', r.ignorees >= 1, String(r.ignorees));
  verifier('aucun nom vide', r.entrees.every((e) => e.nom.length >= 2));
}

console.log('\n=== CSV : séparateur, guillemets, virgule dans un champ ===');
{
  const lignes = lireCsv('Équipe;Joueur 1;Joueur 2\n1;"Thinnes, Pierre";Monique Thill\n2;Cattazzo Rosy;Cattazzo Roby\n');
  verifier('point-virgule détecté', lignes[0].length === 3, JSON.stringify(lignes[0]));
  verifier('virgule protégée par les guillemets', lignes[1][1] === 'Thinnes, Pierre', lignes[1]?.[1]);
  const r = analyserTableau(lignes);
  verifier('4 joueurs après analyse', r.entrees.length === 4, resume(r.entrees));
}
{
  const lignes = lireCsv('Nom,Prénom\n"DUPONT ""Le Grand""",Jean\n');
  verifier('guillemets doublés', lignes[1][0] === 'DUPONT "Le Grand"', lignes[1]?.[0]);
}

console.log('\n=== Rien d\'exploitable ===');
{
  const r = analyserTableau([]);
  verifier('tableau vide ne casse pas', r.entrees.length === 0);
  const r2 = analyserTexte('   \n  \n');
  verifier('texte vide ne casse pas', r2.entrees.length === 0);
}

console.log(echecs === 0 ? '\nTout est vert.\n' : `\n${echecs} vérification(s) en échec.\n`);
process.exit(echecs === 0 ? 0 : 1);
