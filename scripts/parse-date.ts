// Port de parseDateFR_/dateTriable_ (carreau-mondorf-app) : les exports CSV
// Google Sheets peuvent restituer une date en dd/mm/yyyy (format d'affichage
// habituel des colonnes de l'app d'origine) ou en yyyy-mm-dd (si la colonne
// est au format ISO) selon la mise en forme de la cellule source.
export function parseDateSouple(valeur: string | null | undefined): string | null {
  const s = String(valeur ?? '').trim();
  if (!s) return null;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return null;
}

export function parseBooleanOuiNon(valeur: string | null | undefined): boolean | null {
  const s = String(valeur ?? '').trim().toLowerCase();
  if (s === 'oui' || s === 'true' || s === 'vrai') return true;
  if (s === 'non' || s === 'false' || s === 'faux') return false;
  return null;
}

export function parseEntierOuNull(valeur: string | null | undefined): number | null {
  const s = String(valeur ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Montants (Cotisation/Licence) — export CSV français, virgule décimale
 *  possible ("20,00") en plus du point. */
export function parseDecimalOuNull(valeur: string | null | undefined): number | null {
  const s = String(valeur ?? '').trim().replace(',', '.');
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** La colonne "Journée" est préfixée "J" dans Rencontres championnat et
 *  Équipes Promotion (ex. "J10"), mais purement numérique dans Résultats
 *  division D2 (ex. "10") — gère les deux formats indifféremment. */
export function parseJournee(valeur: string | null | undefined): number | null {
  const s = String(valeur ?? '').trim();
  const m = s.match(/^j?(\d+)$/i);
  return m ? Number(m[1]) : null;
}
