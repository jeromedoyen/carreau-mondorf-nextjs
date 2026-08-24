/**
 * Lecture d'une liste de participants venue d'un fichier (Excel, CSV) ou d'une
 * photo analysée par l'IA.
 *
 * Volontairement sans base ni réseau : la reconnaissance de la mise en forme
 * est la partie fragile (chaque club tape sa liste à sa façon), donc elle doit
 * être testable seule — `scripts/verifier-import-tournoi.ts`.
 *
 * Deux dispositions rencontrées en pratique :
 *   - « large »  : une ligne par équipe — Équipe | Joueur 1 | Joueur 2 | Joueur 3
 *   - « longue » : une ligne par joueur — Nom | Prénom | Équipe
 * On les distingue sur l'en-tête quand il y en a un, sinon sur la forme des
 * données.
 */

import { sansAccentsMinuscules } from '@/lib/normalisationTexte';

export type EntreeImport = {
  nom: string;
  /** Numéro d'équipe lu dans le fichier, s'il y en avait un. */
  equipeDepart: number | null;
};

export type LectureTableau = {
  entrees: EntreeImport[];
  /** Ce qui a été compris, à afficher pour que l'organisateur puisse contredire. */
  disposition: 'large' | 'longue' | 'colonne-simple';
  enTeteDetecte: boolean;
  /** Lignes ignorées (vides, ou intitulés parasites). */
  ignorees: number;
};

const cle = (s: unknown) => sansAccentsMinuscules(String(s ?? '')).trim();

/**
 * Un en-tête ne contient QUE des intitulés de colonne. Chercher simplement le
 * mot « équipe » quelque part ferait passer « Équipe 3, Mahnen Jeanny, … »
 * pour un en-tête — et supprimerait silencieusement une équipe entière.
 *
 * Noter l'asymétrie, qui est voulue : « Joueur 1 » est un intitulé de colonne,
 * « Équipe 3 » est une donnée (l'intitulé, lui, s'écrit « Équipe » tout court).
 */
const INTITULE = /^(equipes?|eq|joueurs?\s*\d*|participants?\s*\d*|noms?|prenoms?|nom prenom|numero|n°|no)$/;

function estEnTete(ligne: string[]): boolean {
  const cells = ligne.map(cle).filter((c) => c !== '');
  if (cells.length < 2) return false;
  return cells.every((c) => INTITULE.test(c));
}

/**
 * Sépare un éventuel numéro d'équipe du reste de la cellule. Le numéro est
 * tantôt seul (« 3 », « Équipe 3 »), tantôt collé au premier joueur
 * (« 9) Hebisch Jemp ») — c'est la forme des listes tapées à la main.
 *
 * Un séparateur est exigé dès qu'il reste du texte derrière, pour ne pas
 * amputer un nom qui commencerait par un chiffre.
 */
function extraireNumeroEquipe(v: string): { numero: number | null; reste: string } {
  const brut = String(v ?? '').trim();
  if (!brut) return { numero: null, reste: '' };

  const m = brut.match(/^(?:[ée]q(?:uipe)?\.?\s*)?(\d{1,2})\s*(?:[).:\-–—]\s*(.*)|$)/i);
  if (!m) return { numero: null, reste: brut };
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 1 || n > 99) return { numero: null, reste: brut };
  return { numero: n, reste: (m[2] ?? '').trim() };
}

/**
 * Un nom plausible : au moins deux lettres, pas seulement des chiffres ou de la
 * ponctuation. Sert à écarter les cellules de mise en forme (« total », « — »).
 */
function estNom(v: string): boolean {
  const t = String(v ?? '').trim();
  if (t.length < 2) return false;
  if (!/[a-zA-ZÀ-ÿ]{2}/.test(t)) return false;
  if (/^(total|equipe|joueur|nom|prenom|participant)s?$/.test(cle(t))) return false;
  return true;
}

function nettoyerNom(v: string): string {
  return String(v ?? '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—.,;:)]+|[\s\-–—.,;:(]+$/g, '')
    .trim();
}

/**
 * Analyse un tableau de cellules brutes (déjà extrait d'un .xlsx ou d'un .csv).
 * Ne jette jamais : une liste mal comprise doit arriver à l'écran de correction,
 * pas faire échouer l'import.
 */
export function analyserTableau(lignes: unknown[][]): LectureTableau {
  const grille = lignes.map((l) => (Array.isArray(l) ? l.map((c) => String(c ?? '').trim()) : []));
  const nonVides = grille.filter((l) => l.some((c) => c !== ''));
  if (nonVides.length === 0) {
    return { entrees: [], disposition: 'colonne-simple', enTeteDetecte: false, ignorees: 0 };
  }

  const enTeteDetecte = estEnTete(nonVides[0]);
  const corps = enTeteDetecte ? nonVides.slice(1) : nonVides;
  const entete = enTeteDetecte ? nonVides[0].map(cle) : [];

  // Colonnes nommées : on s'y fie en priorité, c'est l'information la plus sûre.
  const idxNom = entete.findIndex((c) => /^nom/.test(c));
  const idxPrenom = entete.findIndex((c) => /^prenom/.test(c));
  const idxEquipe = entete.findIndex((c) => /^(equipe|eq)\b/.test(c));
  const nbColonnesJoueur = entete.filter((c) => /^(joueur|participant)/.test(c)).length;

  const entrees: EntreeImport[] = [];
  let ignorees = 0;
  let disposition: LectureTableau['disposition'];

  if (enTeteDetecte && idxNom >= 0 && nbColonnesJoueur === 0) {
    // ---- disposition longue : une ligne = un joueur
    disposition = 'longue';
    for (const l of corps) {
      const nom = nettoyerNom(
        idxPrenom >= 0 ? `${l[idxPrenom] ?? ''} ${l[idxNom] ?? ''}` : (l[idxNom] ?? ''),
      );
      if (!estNom(nom)) {
        ignorees++;
        continue;
      }
      entrees.push({
        nom,
        equipeDepart: idxEquipe >= 0 ? extraireNumeroEquipe(l[idxEquipe] ?? '').numero : null,
      });
    }
    return { entrees, disposition, enTeteDetecte, ignorees };
  }

  // ---- large ou colonne simple : on décide sur la largeur réelle des lignes
  const largeurMax = Math.max(...corps.map((l) => l.filter((c) => c !== '').length), 0);
  disposition = largeurMax >= 2 ? 'large' : 'colonne-simple';

  let numeroImplicite = 0;
  for (const l of corps) {
    const cellules = l.filter((c) => c !== '');
    if (cellules.length === 0) {
      ignorees++;
      continue;
    }

    if (disposition === 'colonne-simple') {
      const nom = nettoyerNom(cellules[0]);
      if (!estNom(nom)) {
        ignorees++;
        continue;
      }
      entrees.push({ nom, equipeDepart: null });
      continue;
    }

    // La première cellule porte-t-elle un numéro d'équipe ? Il peut être seul
    // (« 3 ») ou précéder directement le premier joueur (« 9) Hebisch Jemp »).
    const { numero: numeroLu, reste } = extraireNumeroEquipe(cellules[0]);
    const premiers = numeroLu != null ? (reste ? [reste] : []) : [cellules[0]];
    const joueurs = [...premiers, ...cellules.slice(1)].map(nettoyerNom).filter(estNom);
    if (joueurs.length === 0) {
      ignorees++;
      continue;
    }
    numeroImplicite++;
    const numero = numeroLu ?? numeroImplicite;
    for (const j of joueurs) entrees.push({ nom: j, equipeDepart: numero });
  }

  return { entrees, disposition, enTeteDetecte, ignorees };
}

/**
 * Découpe un texte libre (une ligne par équipe, joueurs séparés par des
 * virgules) — c'est ce que renvoie l'IA quand elle lit une photo, et ça sert
 * aussi de repli si un CSV arrive avec un séparateur inattendu.
 */
export function analyserTexte(texte: string): LectureTableau {
  const lignes = texte
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split(/\s*[,;\t]\s*/));
  return analyserTableau(lignes);
}

/** Découpe un CSV simple en respectant les guillemets. */
export function lireCsv(contenu: string): string[][] {
  const separateur = (contenu.match(/;/g)?.length ?? 0) > (contenu.match(/,/g)?.length ?? 0) ? ';' : ',';
  const lignes: string[][] = [];
  let champ = '';
  let ligne: string[] = [];
  let dansGuillemets = false;

  for (let i = 0; i < contenu.length; i++) {
    const c = contenu[i];
    if (dansGuillemets) {
      if (c === '"') {
        if (contenu[i + 1] === '"') {
          champ += '"';
          i++;
        } else dansGuillemets = false;
      } else champ += c;
      continue;
    }
    if (c === '"') dansGuillemets = true;
    else if (c === separateur) {
      ligne.push(champ);
      champ = '';
    } else if (c === '\n') {
      ligne.push(champ);
      lignes.push(ligne);
      ligne = [];
      champ = '';
    } else if (c !== '\r') champ += c;
  }
  ligne.push(champ);
  if (ligne.some((x) => x !== '')) lignes.push(ligne);
  return lignes;
}
