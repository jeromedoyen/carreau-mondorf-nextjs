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

console.log('\n=== Colonne « Club » : la feuille du tournoi 43 (SÉRIE | PRÉNOM | PRÉNOM | CLUB) ===');
{
  const feuille = [
    ['SERIE', 'PRENOM', 'PRENOM', 'CLUB'],
    ['1', 'NATHALIE', 'TANIA', 'Kayl / Mondorf'],
    ['2', 'LINDSAY', 'CELINE', 'Dudelange'],
    ['3', 'ALEXANDRA', 'CHRISTELLE', 'Mondorf'],
    ['4', 'GABY', 'BEBY', 'Belvaux'],
    ['5', 'BABETTE', 'CHRISTIANE', 'Mondorf'],
    ['6', 'JEANINE', 'JENNIFER', 'Mondorf'],
    ['7', 'CARMEN', 'SYLVIE', 'Belvaux'],
    ['8', 'DOMINIQUE', 'CARLA', "Boule d'Or"],
    ['9', 'LYNN', 'MANU', "Boule d'Or"],
    ['10', 'JULIE', 'PATRICIA', 'Mondorf'],
    ['11', 'MAGGY', 'SANDRA', 'Lasauvage'],
    ['12', 'LILIANE', 'Marie-Jean', 'Kayl / Mondorf'],
    ['13', 'DIANE', 'MARIE-ROSE', 'Belvaux'],
    ['14', 'VERONIQUE', 'ANETTE', 'Kayl'],
  ];
  const r = analyserTableau(feuille);
  const clubDe = (n: number) => r.entrees.find((e) => e.equipeDepart === n)?.club;
  verifier('l’en-tête « SERIE / PRENOM / CLUB » est reconnu', r.enTeteDetecte);
  verifier('28 joueurs, ni « SERIE » ni un nom de club pris pour un joueur', r.entrees.length === 28 && r.ignorees === 0, `${r.entrees.length} entrées`);
  verifier('aucun club n’a été lu comme un joueur', !r.entrees.some((e) => /kayl|mondorf|belvaux|dudelange|boule|lasauvage|club|serie/i.test(e.nom)));
  verifier('14 équipes de 2 joueurs, numérotées par la colonne SÉRIE', new Set(r.entrees.map((e) => e.equipeDepart)).size === 14 && r.entrees.filter((e) => e.equipeDepart === 12).length === 2);
  verifier('club de l’équipe 1 : « Kayl / Mondorf » (deux clubs gardés tels quels)', clubDe(1) === 'Kayl / Mondorf', String(clubDe(1)));
  verifier('club de l’équipe 8 : « Boule d\'Or »', clubDe(8) === "Boule d'Or", String(clubDe(8)));
  verifier('les deux joueurs d’une équipe ont le même club', r.entrees.filter((e) => e.equipeDepart === 4).every((e) => e.club === 'Belvaux'));
  verifier('14 équipes, 14 clubs lus', [...new Set(r.entrees.map((e) => e.equipeDepart))].every((n) => !!clubDe(n as number)));

  // Même feuille, en CSV avec point-virgule.
  const csv = feuille.map((l) => l.join(';')).join('\n');
  const rc = analyserTableau(lireCsv(csv));
  verifier('même feuille en CSV : mêmes entrées', JSON.stringify(rc.entrees) === JSON.stringify(r.entrees));

  // Ce que fabrique la lecture par l'IA : un tableau avec en-tête, cellules vides en bout de ligne.
  const ia = analyserTableau([
    ['Série', 'Joueur 1', 'Joueur 2', 'Joueur 3', 'Club'],
    ['1', 'Anne', 'Paul', '', 'Belvaux'],
    ['2', 'Luc', 'Marie', 'Jo', 'Kayl / Mondorf'],
    ['3', 'Eva', '', '', ''],
  ]);
  verifier('lecture IA : équipes de tailles différentes, club en dernière colonne', ia.entrees.length === 6 && ia.entrees.filter((e) => e.equipeDepart === 2).length === 3);
  verifier('lecture IA : le club n’est jamais un joueur', !ia.entrees.some((e) => /belvaux|kayl|mondorf/i.test(e.nom)));
  verifier('lecture IA : club « Kayl / Mondorf » conservé, équipe sans club = null', ia.entrees.find((e) => e.nom === 'Jo')?.club === 'Kayl / Mondorf' && ia.entrees.find((e) => e.nom === 'Eva')?.club === null);

  // Disposition longue : une ligne par joueur, le club est écrit sur chaque ligne ou sur la première seulement.
  const longue = analyserTableau([
    ['Nom', 'Prénom', 'Équipe', 'Club'],
    ['Weber', 'Anne', '1', 'Belvaux'],
    ['Muller', 'Paul', '1', ''],
    ['Klein', 'Luc', '2', 'Kayl'],
    ['Thill', 'Marie', '2', 'Kayl'],
  ]);
  verifier('disposition longue : le club de la 1re ligne vaut pour l’équipe entière', longue.disposition === 'longue' && longue.entrees.every((e) => e.club === (e.equipeDepart === 1 ? 'Belvaux' : 'Kayl')), JSON.stringify(longue.entrees.map((e) => e.club)));

  // Non-régression : sans colonne club, rien ne change.
  const sans = analyserTableau([['Équipe', 'Joueur 1', 'Joueur 2'], ['1', 'Anne', 'Paul'], ['2', 'Luc', 'Marie']]);
  verifier('sans colonne « Club » : club nul et mêmes joueurs qu’avant', sans.entrees.length === 4 && sans.entrees.every((e) => e.club === null));

  // Un joueur qui s'appellerait comme un club ne doit pas disparaître quand il n'y a pas d'en-tête « Club ».
  const sansEntete = analyserTableau([['1', 'Anne', 'Paul'], ['2', 'Luc', 'Mondorf']]);
  verifier('sans en-tête : aucune colonne n’est devinée comme un club', sansEntete.entrees.length === 4 && sansEntete.entrees.every((e) => e.club === null));
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
