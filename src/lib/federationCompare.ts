// Port de normaliserLicence_/normaliserNom_ (carreau-mondorf-app/Code.gs) —
// mêmes règles de rapprochement club <-> fédération, portées à l'identique.

/** Ne garde que les chiffres d'un numéro de licence — le club écrit
 *  "15750", la fédération écrit "15.662". Sans cette normalisation, aucune
 *  correspondance ne matche. */
export function normaliserLicence(valeur: unknown): string {
  return String(valeur ?? '').replace(/[^0-9]/g, '');
}

/** Ignore accents/casse/espaces superflus pour comparer deux noms —
 *  "DOYEN"/"Doyen" ne doivent pas être vus comme une divergence. */
export function normaliserNom(valeur: unknown): string {
  return String(valeur ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export type LicencieClub = {
  idPersonne: number;
  idAdhesion: number;
  nom: string;
  prenom: string;
  dateNaissance: string | null;
  licence: string | null;
  categorie: string | null;
  classe: string | null;
};

export type LigneFederation = Record<string, string>;

export type Ecart = { champ: string; club: string | null; federation: string | null };

export type LigneRapport = {
  statut: 'OK' | 'DIVERGENCE' | 'MANQUANT_CLUB' | 'MANQUANT_FEDERATION';
  club: LicencieClub | null;
  federation: LigneFederation | null;
  ecarts: Ecart[];
};

/** Compare les licenciés du club avec le fichier fédération — même logique
 *  de rapprochement que comparerFichierFederation() (Code.gs) : licence en
 *  clé primaire, repli nom+prénom+date de naissance normalisés. */
export function comparerLicencies(
  licenciesClub: LicencieClub[],
  licenciesFederation: LigneFederation[]
): LigneRapport[] {
  const rapport: LigneRapport[] = [];
  const federationTraitee = new Set<LigneFederation>();

  for (const club of licenciesClub) {
    const licenceClubNorm = normaliserLicence(club.licence);

    let match = licenceClubNorm
      ? licenciesFederation.find((f) => normaliserLicence(f['Licence']) === licenceClubNorm)
      : undefined;

    if (!match) {
      match = licenciesFederation.find(
        (f) =>
          normaliserNom(f['Nom']) === normaliserNom(club.nom) &&
          normaliserNom(f['Prénom']) === normaliserNom(club.prenom) &&
          f['Date de naissance'] === club.dateNaissance
      );
    }

    if (!match) {
      rapport.push({ statut: 'MANQUANT_FEDERATION', club, federation: null, ecarts: [] });
      continue;
    }

    federationTraitee.add(match);

    const ecarts: Ecart[] = [];
    const comparerBrut = (champ: string, valClub: string | null, valFed: string | undefined) => {
      if (String(valClub ?? '').trim() !== String(valFed ?? '').trim()) {
        ecarts.push({ champ, club: valClub, federation: valFed ?? null });
      }
    };

    if (normaliserLicence(club.licence) !== normaliserLicence(match['Licence'])) {
      ecarts.push({ champ: 'Licence', club: club.licence, federation: match['Licence'] ?? null });
    }
    if (normaliserNom(club.nom) !== normaliserNom(match['Nom'])) {
      ecarts.push({ champ: 'Nom', club: club.nom, federation: match['Nom'] ?? null });
    }
    if (normaliserNom(club.prenom) !== normaliserNom(match['Prénom'])) {
      ecarts.push({ champ: 'Prénom', club: club.prenom, federation: match['Prénom'] ?? null });
    }
    comparerBrut('Catégorie', club.categorie, match['Catégorie']);
    comparerBrut('Classe', club.classe, match['Classe']);

    rapport.push({ statut: ecarts.length ? 'DIVERGENCE' : 'OK', club, federation: match, ecarts });
  }

  for (const f of licenciesFederation) {
    if (!federationTraitee.has(f)) {
      rapport.push({ statut: 'MANQUANT_CLUB', club: null, federation: f, ecarts: [] });
    }
  }

  return rapport;
}
