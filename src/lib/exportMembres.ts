import type { PersonneAvecAdhesion } from './types';

/** Export Excel du registre des membres (demande de Jérôme, 25/09/2026) :
 *  filtrer la liste de `/membres`, puis la télécharger telle qu'affichée.
 *
 *  Le fichier contient exactement les personnes visibles à l'écran, dans le
 *  même ordre — pas la base entière. Une seconde feuille, « Critères »,
 *  rappelle la saison, les filtres appliqués et la date d'export : un
 *  fichier Excel circule, et six semaines plus tard personne ne se souvient
 *  que « la liste » était celle des cotisations impayées de 2026.
 *
 *  Colonnes : tout le registre, sauf les **notes internes** du comité,
 *  volontairement absentes — elles n'ont pas vocation à sortir de
 *  l'application avec une liste d'adresses.
 *
 *  Aucune vérification d'accès ici : la page `/membres` est réservée au CA
 *  et la RLS ne transmet les données qu'au CA. Ce module ne fait que mettre
 *  en forme ce que le navigateur a déjà reçu. */

export const ENTETES_EXPORT = [
  'Nom',
  'Prénom',
  'Type',
  'Catégorie',
  'Classe',
  'N° de licence',
  'Sexe',
  'Date de naissance',
  'Nationalité',
  'Adresse',
  'Code postal et ville',
  'Téléphone',
  'E-mail',
  "Droit à l'image",
  'Cotisation',
  'Licence',
] as const;

/** Colonne des dates de naissance, écrite en vraie date Excel (triable),
 *  pas en texte. */
const COLONNE_DATE = ENTETES_EXPORT.indexOf('Date de naissance');

/** Largeurs de colonnes, en caractères. */
const LARGEURS = [18, 16, 14, 10, 12, 13, 6, 14, 14, 30, 24, 16, 30, 14, 12, 12];

export type Cellule = string | number | null;

function ouiNon(v: boolean | null | undefined): string {
  if (v === true) return 'Oui';
  if (v === false) return 'Non';
  return '';
}

/** Date ISO (AAAA-MM-JJ) → numéro de série Excel. Calculé en UTC : passer
 *  par `new Date()` local décale d'un jour selon le fuseau et l'heure d'été,
 *  et un anniversaire au 12 mai deviendrait le 11. */
export function dateVersSerieExcel(iso: string | null): number | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  const jour = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const origine = Date.UTC(1899, 11, 30);
  return Math.round((jour - origine) / 86400000);
}

/** Une ligne par personne, dans l'ordre reçu, colonnes = `ENTETES_EXPORT`.
 *  Pure et sans dépendance : c'est la partie qui compte, et elle se teste
 *  sans navigateur. */
export function lignesExportMembres(personnes: PersonneAvecAdhesion[]): Cellule[][] {
  return personnes.map((p) => {
    const a = p.adhesion;
    return [
      p.nom,
      p.prenom,
      a?.type ?? '',
      a?.categorie ?? '',
      a?.classe ?? '',
      a?.licence ?? '',
      p.sexe ?? '',
      dateVersSerieExcel(p.dateNaissance),
      p.nationalite ?? '',
      p.adresse ?? '',
      p.codePostalVille ?? '',
      p.telephone ?? '',
      p.email ?? '',
      ouiNon(p.droitImage),
      a ? (a.cotisationPayee ? 'Payée' : 'Non payée') : '',
      // Même règle que le filtre de l'écran : la licence n'existe que pour
      // les licenciés ; pour les autres, rien n'est « impayé ».
      a?.licence ? (a.licencePayee ? 'Payée' : 'Non payée') : 'Sans objet',
    ];
  });
}

export function nomFichierExport(saison: string, maintenant: Date = new Date()): string {
  const d = maintenant;
  const jj = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `membres-${saison}_${d.getFullYear()}-${mm}-${jj}.xlsx`;
}

/** Construit le classeur (.xlsx) en mémoire. `xlsx` est chargé à la demande,
 *  comme dans `TournoiImport` : la bibliothèque pèse plusieurs centaines de
 *  kilo-octets et ne sert qu'au moment du clic. */
export async function construireClasseurMembres(
  personnes: PersonneAvecAdhesion[],
  contexte: { saison: string; criteres: string[]; total: number; maintenant?: Date }
): Promise<ArrayBuffer> {
  const XLSX = await import('xlsx');
  const maintenant = contexte.maintenant ?? new Date();

  const lignes = lignesExportMembres(personnes);
  const feuille = XLSX.utils.aoa_to_sheet([[...ENTETES_EXPORT], ...lignes]);

  // Dates de naissance : cellule numérique au format jj/mm/aaaa.
  lignes.forEach((ligne, i) => {
    if (ligne[COLONNE_DATE] == null) return;
    const ref = XLSX.utils.encode_cell({ r: i + 1, c: COLONNE_DATE });
    const cellule = feuille[ref];
    if (cellule) {
      cellule.t = 'n';
      cellule.z = 'dd/mm/yyyy';
    }
  });
  feuille['!cols'] = LARGEURS.map((wch) => ({ wch }));
  // Filtre automatique Excel sur la ligne d'en-tête.
  if (lignes.length) {
    feuille['!autofilter'] = {
      ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lignes.length, c: ENTETES_EXPORT.length - 1 } }),
    };
  }

  const horodatage = maintenant.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const criteres = XLSX.utils.aoa_to_sheet([
    ['Registre des membres — Carreau Boules et Pétanque Mondorf'],
    [],
    ['Saison', contexte.saison],
    ['Exporté le', horodatage],
    ['Personnes exportées', `${personnes.length} sur ${contexte.total}`],
    [],
    ['Filtres appliqués'],
    ...(contexte.criteres.length ? contexte.criteres.map((c) => ['', c]) : [['', 'Aucun — liste complète de la saison']]),
  ]);
  criteres['!cols'] = [{ wch: 22 }, { wch: 50 }];

  const classeur = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(classeur, feuille, 'Membres');
  XLSX.utils.book_append_sheet(classeur, criteres, 'Critères');
  return XLSX.write(classeur, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
}
