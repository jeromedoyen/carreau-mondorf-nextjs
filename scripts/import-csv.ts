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
 *                      --parties data/parties_d2.csv \
 *                      --personnes data/personnes.csv \
 *                      --adhesions data/adhesions.csv \
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
 *   - parties         : Id, Id_Rencontre, Phase, Type, Ordre, Joueurs CM,
 *                       Joueurs Adverse, Score CM, Score Adverse, Terrain, Supprimé
 *                       (Id_Rencontre = l'Id d'origine de "Rencontres championnat" ;
 *                       --rencontres doit avoir été importé au préalable — la
 *                       résolution se fait via source_id, pas d'ordre imposé
 *                       entre les deux imports sinon).
 *   - acces           : Email, Nom (export de l'onglet "Accès" — liste
 *                       d'autorisation minimale pour l'OTP, PAS le registre
 *                       complet des membres). Lignes sans email ignorées.
 *   - personnes       : Id, NOM, Prénom, Sexe, Date de naissance, Nationalité,
 *                       Adresse, Code postal / Ville, Téléphone, Email,
 *                       Droit à l'image, Supprimé — DONNÉES PERSONNELLES
 *                       RÉELLES (RGPD), à importer seulement après
 *                       confirmation explicite (cf. CONTEXTE_PROJET.md).
 *                       --adhesions doit être importé après --personnes
 *                       (résolution Id_Personne -> personnes.id).
 *   - adhesions       : Id, Id_Personne, Année, Type, Licence, Catégorie,
 *                       Classe, Supprimé, Cotisation payée, Cotisation date,
 *                       Cotisation montant, Cotisation mode, Licence payée,
 *                       Licence date, Licence montant.
 *
 * --dry-run : parse et affiche les compteurs sans rien écrire dans Supabase
 * (utile pour valider un export avant de configurer les identifiants).
 */
import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import { canoniserClubD2 } from './club-aliases';
import {
  parseBooleanOuiNon,
  parseDateSouple,
  parseDecimalOuNull,
  parseEntierOuNull,
  parseJournee,
} from './parse-date';

config({ path: '.env.local' });

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
    parties: argument('parties'),
    acces: argument('acces'),
    personnes: argument('personnes'),
    adhesions: argument('adhesions'),
  };

  if (
    !chemins.rencontres &&
    !chemins.division &&
    !chemins.promotion &&
    !chemins.federation &&
    !chemins.parties &&
    !chemins.acces &&
    !chemins.personnes &&
    !chemins.adhesions
  ) {
    console.error(
      'Aucun fichier CSV fourni. Voir l’en-tête de scripts/import-csv.ts pour l’usage.'
    );
    process.exit(1);
  }

  let supabase: ReturnType<typeof createClient> | null = null;
  if (!dryRun) {
    const url = process.env.SUPABASE_URL;
    // Nouvelle terminologie Supabase : clé "secret" (sb_secret_...), remplace
    // l'ancienne clé "service_role" — même usage (contourne la RLS).
    const serviceKey = process.env.SUPABASE_SECRET_KEY;
    if (!url || !serviceKey) {
      console.error(
        'SUPABASE_URL / SUPABASE_SECRET_KEY manquants dans .env.local (voir .env.local.example). Utilisez --dry-run pour juste valider le parsing.'
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
      journee: parseJournee(l['Journée']),
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
      journee: parseJournee(l['Journée']),
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

  // --- Parties championnat (détail des 20 parties par rencontre, National D2) ---
  if (chemins.parties) {
    const lignes = lireCsv(chemins.parties).filter(nonSupprime);
    if (!dryRun && supabase) {
      // Résout Id_Rencontre (Id d'origine côté Sheet) -> rencontres_d2.id
      // (Supabase) via source_id — nécessite que --rencontres ait déjà été
      // importé (dans cette exécution ou une précédente).
      const { data: rencontres, error: errR } = await supabase
        .from('rencontres_d2')
        .select('id, source_id');
      if (errR) throw errR;
      const idParSourceId = new Map(
        ((rencontres ?? []) as { id: number; source_id: string | null }[]).map((r) => [
          String(r.source_id),
          r.id,
        ])
      );

      const rows: Record<string, unknown>[] = [];
      const introuvables = new Set<string>();
      for (const l of lignes) {
        const rencontreId = idParSourceId.get(String(l['Id_Rencontre']));
        if (!rencontreId) {
          introuvables.add(l['Id_Rencontre']);
          continue;
        }
        rows.push({
          source_id: l['Id'],
          rencontre_id: rencontreId,
          phase: parseEntierOuNull(l['Phase']),
          type: l['Type'],
          ordre: parseEntierOuNull(l['Ordre']),
          joueurs_cm: l['Joueurs CM'],
          joueurs_adverse: l['Joueurs Adverse'] || null,
          score_cm: parseEntierOuNull(l['Score CM']),
          score_adverse: parseEntierOuNull(l['Score Adverse']),
          terrain: l['Terrain'] || null,
        });
      }
      if (introuvables.size) {
        console.warn(
          `parties_d2 : ${introuvables.size} Id_Rencontre introuvable(s) dans rencontres_d2 (lignes ignorées) : ${[...introuvables].join(', ')}`
        );
      }
      console.log(`parties_d2 : ${rows.length} lignes (après filtre Supprimé + résolution rencontre).`);
      const { error } = await supabase.from('parties_d2').insert(rows as never[]);
      if (error) throw error;
    } else {
      console.log(
        `parties_d2 : ${lignes.length} lignes (après filtre Supprimé) — résolution Id_Rencontre non vérifiée en --dry-run.`
      );
    }
  }

  // --- Accès (liste d'autorisation minimale pour l'OTP) ---
  if (chemins.acces) {
    const lignes = lireCsv(chemins.acces).filter((l) => (l['Email'] || '').trim());
    const rows = lignes.map((l) => ({
      email: l['Email'].trim().toLowerCase(),
      nom: l['Nom'] || '',
    }));
    console.log(`acces : ${rows.length} lignes (lignes sans email ignorées).`);
    if (!dryRun && supabase) {
      const { error } = await supabase.from('acces').insert(rows as never[]);
      if (error) throw error;
    }
  }

  // --- Personnes (registre membres — RGPD, cf. avertissement en tête de fichier) ---
  if (chemins.personnes) {
    const lignes = lireCsv(chemins.personnes).filter(nonSupprime);
    const rows = lignes.map((l) => ({
      source_id: l['Id'],
      nom: l['NOM'],
      prenom: l['Prénom'],
      sexe: l['Sexe'] || null,
      date_naissance: parseDateSouple(l['Date de naissance']),
      nationalite: l['Nationalité'] || null,
      adresse: l['Adresse'] || null,
      code_postal_ville: l['Code postal / Ville'] || null,
      telephone: l['Téléphone'] || null,
      email: l['Email'] || null,
      droit_image: parseBooleanOuiNon(l["Droit à l'image"]),
    }));
    console.log(`personnes : ${rows.length} lignes (après filtre Supprimé).`);
    if (!dryRun && supabase) {
      const { error } = await supabase.from('personnes').insert(rows as never[]);
      if (error) throw error;
    }
  }

  // --- Adhésions (une ligne = une personne pour une année donnée) ---
  if (chemins.adhesions) {
    const lignes = lireCsv(chemins.adhesions).filter(nonSupprime);
    if (!dryRun && supabase) {
      const { data: personnes, error: errP } = await supabase
        .from('personnes')
        .select('id, source_id');
      if (errP) throw errP;
      const idParSourceId = new Map(
        ((personnes ?? []) as { id: number; source_id: string | null }[]).map((p) => [
          String(p.source_id),
          p.id,
        ])
      );

      const rows: Record<string, unknown>[] = [];
      const introuvables = new Set<string>();
      for (const l of lignes) {
        const personneId = idParSourceId.get(String(l['Id_Personne']));
        if (!personneId) {
          introuvables.add(l['Id_Personne']);
          continue;
        }
        rows.push({
          source_id: l['Id'],
          personne_id: personneId,
          annee: l['Année'],
          type: l['Type'],
          licence: l['Licence'] || null,
          categorie: l['Catégorie'] || null,
          classe: l['Classe'] || null,
          cotisation_payee: parseBooleanOuiNon(l['Cotisation payée']),
          cotisation_date: parseDateSouple(l['Cotisation date']),
          cotisation_montant: parseDecimalOuNull(l['Cotisation montant']),
          cotisation_mode: l['Cotisation mode'] || null,
          licence_payee: parseBooleanOuiNon(l['Licence payée']),
          licence_date: parseDateSouple(l['Licence date']),
          licence_montant: parseDecimalOuNull(l['Licence montant']),
        });
      }
      if (introuvables.size) {
        console.warn(
          `adhesions : ${introuvables.size} Id_Personne introuvable(s) dans personnes (lignes ignorées) : ${[...introuvables].join(', ')}`
        );
      }
      console.log(`adhesions : ${rows.length} lignes (après filtre Supprimé + résolution personne).`);
      const { error } = await supabase.from('adhesions').insert(rows as never[]);
      if (error) throw error;
    } else {
      console.log(
        `adhesions : ${lignes.length} lignes (après filtre Supprimé) — résolution Id_Personne non vérifiée en --dry-run.`
      );
    }
  }

  console.log(dryRun ? '\n--dry-run : rien écrit dans Supabase.' : '\nImport terminé.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
