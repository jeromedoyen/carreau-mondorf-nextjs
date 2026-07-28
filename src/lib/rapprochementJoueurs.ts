export type LicencieCM = { prenom: string; nom: string };

/** Surnoms connus qui ne se déduisent pas du prénom officiel (28/07/2026,
 *  demande Jérôme — port simplifié de rapprocherNomJoueur_/table de
 *  surnoms, ChampionnatBackend.gs). À compléter au fil des feuilles de
 *  match rencontrées. */
const SURNOMS: Record<string, string> = {
  kiki: 'christian chenal',
  tun: 'josé antonio martins',
  toon: 'josé antonio martins',
  antonio: 'josé antonio martins',
};

function normaliser(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function canonique(p: LicencieCM): string {
  return `${p.nom.toUpperCase()} ${p.prenom}`;
}

function initiales(nom: string): string {
  return normaliser(nom)
    .split(' ')
    .map((mot) => mot[0])
    .join('');
}

/** Rapproche un nom de joueur saisi librement (surnom, prénom + initiale du
 *  nom, "Nom Prénom"...) avec la liste des licenciés Carreau Mondorf.
 *  Retourne la forme canonique "NOM Prénom" en cas de correspondance sûre,
 *  sinon le texte saisi tel quel (pas de blocage — mieux vaut une entrée
 *  non rapprochée que perdue). */
export function rapprocherJoueurCM(brut: string, roster: LicencieCM[]): string {
  const saisi = normaliser(brut);
  if (!saisi) return brut;

  // Déjà sous forme canonique ("NOM Prénom" ou "Prénom NOM").
  const exact = roster.find(
    (p) => normaliser(canonique(p)) === saisi || normaliser(`${p.prenom} ${p.nom}`) === saisi
  );
  if (exact) return canonique(exact);

  // Table de surnoms.
  const cibleSurnom = SURNOMS[saisi.split(' ')[0]];
  if (cibleSurnom) {
    const trouve = roster.find((p) => normaliser(`${p.prenom} ${p.nom}`) === cibleSurnom);
    if (trouve) return canonique(trouve);
  }

  const mots = saisi.split(' ');
  const premierMot = mots[0];
  const resteInitiales = mots.slice(1).join('');

  // Stratégie "Prénom [+ initiale(s) du nom]" — ex. "Serge G", "Yann LB".
  const candidatsParPrenom = roster.filter((p) => normaliser(p.prenom).split(' ')[0] === premierMot);
  if (candidatsParPrenom.length === 1) return canonique(candidatsParPrenom[0]);
  if (candidatsParPrenom.length > 1 && resteInitiales) {
    const filtres = candidatsParPrenom.filter((p) => initiales(p.nom) === resteInitiales);
    if (filtres.length === 1) return canonique(filtres[0]);
  }

  // Stratégie "Nom [multi-mots] + initiale du prénom" — ex. "Le Berre Y".
  if (mots.length >= 2) {
    const dernierMot = mots[mots.length - 1];
    const nomCandidat = mots.slice(0, -1).join(' ');
    const candidatsParNom = roster.filter((p) => normaliser(p.nom) === nomCandidat);
    if (candidatsParNom.length === 1) return canonique(candidatsParNom[0]);
    if (candidatsParNom.length > 1) {
      const filtres = candidatsParNom.filter((p) => normaliser(p.prenom).startsWith(dernierMot));
      if (filtres.length === 1) return canonique(filtres[0]);
    }
  }

  return brut;
}

/** Applique rapprocherJoueurCM à une liste de joueurs séparés par des
 *  virgules (cas des doublettes/triplettes). */
export function rapprocherJoueursCM(brut: string, roster: LicencieCM[]): string {
  return brut
    .split(',')
    .map((nom) => rapprocherJoueurCM(nom.trim(), roster))
    .filter(Boolean)
    .join(', ');
}
