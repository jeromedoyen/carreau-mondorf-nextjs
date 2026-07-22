/**
 * Import ponctuel des données du module Compétition depuis des exports CSV
 * de l'app Apps Script d'origine (carreau-mondorf-app) — copie unique, aucun
 * lien continu ensuite. À lancer une seule fois (ou pour rafraîchir le
 * prototype avec des données plus récentes, en le relançant après avoir vidé
 * les tables — pas d'upsert intelligent, volontairement simple).
 *
 * Utilisation :
 *   npm run import -- --rencontres data/rencontres_d2.csv \
 *                      --division data/division_d2.csv \
 *                      --promotion data/equipes_promotion.csv \
 *                      --federation data/calendrier_federation.csv \
 *                      [--dry-run]
 *
 * Chaque CSV doit avoir exactement les en-têtes de la feuille Google Sheets
 * d'origine (export "Fichier > Télécharger > Valeurs séparées par des
 * virgules" depuis l'onglet correspondant) :
 *   - rencontres_d2   : Id, Saison, Division, Journée, Date, Domicile,
 *                       Club adverse, Lieu, Statut, Score CM, Score Adverse,
 *                       Résultat, Capitaine CM, Arbitre / Délégué, Notes, Supprimé
 *   - division_d2     : Id, Saison, Journée, Date, Club A, Club B, Points A,
 *                       Points B, Exempt, Supprimé
 *   - promotion       : Id, Saison, Journée, Date, N° Équipe, Catégorie, Type,
 *                       Joueur 1, Joueur 2, Joueur 3, Parties gagnées, Points, Supprimé
 *   - federation      : Id, Saison, Date, Date fin, Libellé, Catégorie, Lieu,
 *                       Domicile, Concerne le club, Notes, Supprimé
 *
 * --dry-run : parse et affiche les compteurs sans rien écrire dans Supabase
 * (utile pour valider un export avant de configurer les identifiants).
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { canoniserClubD2 } from './club-aliases';
import { parseBooleanOuiNon, parseDateSouple, parseEntierOuNull } from './parse-date';

type Ligne = Record<string, string>;

function lireCsv(chemin: string): Ligne[] {
  const contenu = readFileSync(chemin, 'utf-8');
  return parse(contenu, { columns: true, skip_empty_lines: true, trim: true }) as Ligne[];
}

function nonSupprime(ligne: Ligne): boolean {
  const v = String(ligne['Supprimé'] ?? '').trim().toLowerCase();
  return v !== 'true' && v !== 'vrai' && v !== '1';
}

function argument(nom: string): string | undefined {
  const i = process.argv.indexOf(`--${nom}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const chemins = {
    rencontres: argument('rencontres'),
    division: argument('division'),
    promotion: argument('promotion'),
    federation: argument('federation'),
  };

  if (!chemins.rencontres && !chemins.division && !chemins.promotion && !chemins.federation) {
    console.error(
      'Aucun fichier CSV fourni. Voir l’en-tête de scripts/import-csv.ts pour l’usage.'
    );
    process.exit(1);
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  if (!dryRun) {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      console.error(
        'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local (voir .env.local.example). Utilisez --dry-run pour juste valider le parsing.'
      );
      process.exit(1);
    }
    supabase = createClient(url, serviceKey);
  }

  // --- Rencontres D2 (Carreau Mondorf) ---
  if (chemins.rencontres) {
    const lignes = lireCsv(chemins.rencontres).filter(nonSupprime);
    const rows = lignes.map((l) => ({
      source_id: l['Id'],
      saison: l['Saison'],
      division: l['Division'] || 'National D2',
      journee: parseEntierOuNull(l['Journée']),
      date: parseDateSouple(l['Date']),
      domicile: parseBooleanOuiNon(l['Domicile']),
      club_adverse: l['Club adverse'] || null,
      lieu: l['Lieu'] || null,
      statut: l['Statut'],
      score_cm: parseEntierOuNull(l['Score CM']),
      score_adverse: parseEntierOuNull(l['Score Adverse']),
      resultat: l['Résultat'] || null,
      capitaine_cm: l['Capitaine CM'] || null,
      arbitre_delegue: l['Arbitre / Délégué'] || null,
      notes: l['Notes'] || null,
    }));
    console.log(`rencontres_d2 : ${rows.length} lignes (après filtre Supprimé).`);
    if (!dryRun && supabase) {
      const { error } = await supabase.from('rencontres_d2').insert(rows as never[]);
      if (error) throw error;
    }
  }

  // --- Résultats division D2 (poule complète) ---
  if (chemins.division) {
    const lignes = lireCsv(chemins.division).filter(nonSupprime);
    const rows = lignes.map((l) => ({
      source_id: l['Id'],
      saison: l['Saison'],
      journee: parseEntierOuNull(l['Journée']),
      date: parseDateSouple(l['Date']),
      club_a: l['Club A'] ? canoniserClubD2(l['Club A']) : null,
      club_b: l['Club B'] ? canoniserClubD2(l['Club B']) : null,
      points_a: parseEntierOuNull(l['Points A']),
      points_b: parseEntierOuNull(l['Points B']),
      exempt: l['Exempt'] ? canoniserClubD2(l['Exempt']) : null,
    }));
    console.log(`division_d2_resultats : ${rows.length} lignes.`);
    if (!dryRun && supabase) {
      const { error } = await supabase.from('division_d2_resultats').insert(rows as never[]);
      if (error) throw error;
    }
  }

  // --- Équipes Promotion ---
  if (chemins.promotion) {
    const lignes = lireCsv(chemins.promotion).filter(nonSupprime);
    const rows = lignes.map((l) => ({
      source_id: l['Id'],
      saison: l['Saison'],
      journee: parseEntierOuNull(l['Journée']),
      date: parseDateSouple(l['Date']),
      numero_equipe: parseEntierOuNull(l['N° Équipe']),
      categorie: l['Catégorie'] || null,
      type: l['Type'] || null,
      joueur_1: l['Joueur 1'] || null,
      joueur_2: l['Joueur 2'] || null,
      joueur_3: l['Joueur 3'] || null,
      parties_gagnees: parseEntierOuNull(l['Parties gagnées']) ?? 0,
      // `points` est une colonne générée côté base (parties_gagnees * 5) —
      // ne pas l'envoyer à l'insertion.
    }));
    console.log(`promotion_equipes : ${rows.length} lignes.`);
    if (!dryRun && supabase) {
      const { error } = await supabase.from('promotion_equipes').insert(rows as never[]);
      if (error) throw error;
    }
  }

  // --- Calendrier fédération ---
  if (chemins.federation) {
    const lignes = lireCsv(chemins.federation).filter(nonSupprime);
    const rows = lignes.map((l) => ({
      source_id: l['Id'],
      saison: l['Saison'],
      date: parseDateSouple(l['Date']),
      date_fin: parseDateSouple(l['Date fin']),
      libelle: l['Libellé'],
      categorie: l['Catégorie'] || null,
      lieu: l['Lieu'] || null,
      domicile: parseBooleanOuiNon(l['Domicile']),
      concerne_club: parseBooleanOuiNon(l['Concerne le club']) ?? false,
      notes: l['Notes'] || null,
    }));
    console.log(`calendrier_federation : ${rows.length} lignes.`);
    if (!dryRun && supabase) {
      const { error } = await supabase.from('calendrier_federation').insert(rows as never[]);
      if (error) throw error;
    }
  }

  console.log(dryRun ? '\n--dry-run : rien écrit dans Supabase.' : '\nImport terminé.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
