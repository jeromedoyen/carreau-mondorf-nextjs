/** Rapprochement d'un nom dicté avec la liste des licenciés.
 *
 *  Équivalent allégé de rapprocherNomJoueur_() (ChampionnatBackend.gs,
 *  projet v1), jamais porté jusqu'ici parce que la saisie se faisait
 *  toujours par sélection dans une liste. La déclaration vocale change la
 *  donne : le modèle rend "Paul", "Jean-Marie Weber" ou "Wéber" et il faut
 *  retomber sur une fiche personne — ou admettre qu'on n'y arrive pas.
 *
 *  Principe : on ne devine JAMAIS. Sous le seuil de confiance, ou si deux
 *  licenciés sont également plausibles, la fonction renvoie une ambiguïté
 *  qui déclenchera un e-mail de clarification. Un faux positif ici, c'est
 *  un remboursement versé au nom de quelqu'un qui n'a pas joué. */

export type Licencie = { id: number; nom: string; prenom: string };

export type Rapprochement =
  | { trouve: true; licencie: Licencie; score: number }
  | { trouve: false; raison: 'aucun' | 'ambigu'; candidats: Licencie[] };

/** Casse/accents/ponctuation neutralisés — "Jean-Marie WÉBER" et
 *  "jean marie weber" doivent produire la même chose. */
export function normaliserNom(texte: string): string {
  return String(texte || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function distanceLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let precedente = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const courante = [i];
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      courante[j] = Math.min(courante[j - 1] + 1, precedente[j] + 1, precedente[j - 1] + cout);
    }
    precedente = courante;
  }
  return precedente[b.length];
}

/** Similarité 0..1 entre deux chaînes déjà normalisées. */
function similarite(a: string, b: string): number {
  if (!a || !b) return 0;
  const longueur = Math.max(a.length, b.length);
  return 1 - distanceLevenshtein(a, b) / longueur;
}

/** Score d'un nom dicté contre un licencié. Un vocal dit souvent juste un
 *  prénom ("je suis avec Paul") : un prénom seul qui correspond exactement
 *  vaut donc un bon score, mais la levée d'ambiguïté entre deux Paul est
 *  laissée à l'appelant (deux scores égaux = ambigu). */
function scorerCandidat(dicteNormalise: string, licencie: Licencie): number {
  const prenom = normaliserNom(licencie.prenom);
  const nom = normaliserNom(licencie.nom);
  const complet = `${prenom} ${nom}`.trim();
  const inverse = `${nom} ${prenom}`.trim();

  return Math.max(
    similarite(dicteNormalise, complet),
    similarite(dicteNormalise, inverse),
    // Prénom ou nom seul : plafonné à 0.9 pour qu'une correspondance
    // complète l'emporte toujours sur une correspondance partielle. La
    // pénalité reste légère (0.95) car Whisper écorche régulièrement les
    // noms de famille ("Prybila" pour "Prybyla") — trop sévère, on
    // relancerait le déclarant à chaque déclaration.
    dicteNormalise === prenom ? 0.9 : similarite(dicteNormalise, prenom) * 0.95,
    dicteNormalise === nom ? 0.9 : similarite(dicteNormalise, nom) * 0.95
  );
}

/** Seuil retenu : en dessous, on préfère demander au déclarant plutôt que
 *  d'attribuer un remboursement à la mauvaise personne. */
const SEUIL_CONFIANCE = 0.78;
/** Écart minimal avec le 2e meilleur candidat pour trancher sans demander. */
const ECART_MINIMAL = 0.08;

export function rapprocherNom(dicte: string, licencies: Licencie[]): Rapprochement {
  const normalise = normaliserNom(dicte);
  if (!normalise) return { trouve: false, raison: 'aucun', candidats: [] };

  const scores = licencies
    .map((licencie) => ({ licencie, score: scorerCandidat(normalise, licencie) }))
    .sort((a, b) => b.score - a.score);

  const meilleur = scores[0];
  if (!meilleur || meilleur.score < SEUIL_CONFIANCE) {
    return { trouve: false, raison: 'aucun', candidats: scores.slice(0, 3).map((s) => s.licencie) };
  }

  const second = scores[1];
  if (second && meilleur.score - second.score < ECART_MINIMAL) {
    // Deux homonymes plausibles (deux "Paul") — on ne tranche pas au hasard.
    const exAequo = scores.filter((s) => meilleur.score - s.score < ECART_MINIMAL).map((s) => s.licencie);
    return { trouve: false, raison: 'ambigu', candidats: exAequo };
  }

  return { trouve: true, licencie: meilleur.licencie, score: meilleur.score };
}
