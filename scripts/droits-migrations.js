#!/usr/bin/env node
/**
 * Contrôle des droits « API de données » dans les migrations SQL.
 * Règle posée le 21/10/2026, après l'avis de Supabase du 20/10/2026.
 *
 * CONTEXTE. Jusqu'ici, toute table créée dans le schéma `public` recevait
 * automatiquement des droits pour les rôles `anon`, `authenticated` et
 * `service_role`, donc elle était joignable par supabase-js. À partir du
 * 30/10/2026, Supabase ne le fait plus pour les NOUVELLES tables des projets
 * existants : sans GRANT explicite, l'API répond « permission denied », y
 * compris pour le code serveur en clé service_role. Les tables déjà en base ne
 * changent pas.
 *
 * RÈGLE. Une migration qui crée une table (ou une vue) dans `public` porte,
 * dans le même fichier, un `grant ... on <table> to <rôle>` pour au moins un
 * des trois rôles. Ou bien elle déclare en commentaire que la table n'est
 * volontairement pas exposée à l'API :
 *     -- sans-grant: ma_table : lue seulement par une fonction security definer
 * Modèle prêt à copier : supabase/MODELE_MIGRATION.sql.
 *
 * PORTÉE. Seules les migrations dont le nom est >= PREMIERE_MIGRATION_SOUMISE
 * sont contrôlées de façon bloquante. Les plus anciennes ne portent aucun droit
 * (elles comptaient sur l'octroi automatique) : on ne les modifie jamais, mais
 * on signale leur existence quand une base neuve les rejoue.
 *
 * USAGE.
 *   node scripts/droits-migrations.js               contrôle ; code de sortie 1 s'il y a une infraction
 *   node scripts/droits-migrations.js --historique  idem + détail des anciennes migrations sans droits
 *   Le lanceur scripts/appliquer-migrations.js l'appelle avant toute connexion.
 *
 * LIMITES. C'est une lecture du texte SQL, pas de la base : elle ne voit pas
 * les tables créées par SQL dynamique, ne distingue pas la création d'un
 * `create or replace view` de son remplacement (ces vues ne sont donc pas
 * contrôlées), et ne juge pas si les droits accordés sont cohérents avec la
 * RLS. Elle attrape l'oubli, pas l'erreur de fond.
 */
/* eslint-disable @typescript-eslint/no-require-imports -- script Node en CommonJS, comme appliquer-migrations.js */
const fs = require('fs');
const path = require('path');

const DOSSIER_MIGRATIONS = path.join(__dirname, '..', 'supabase', 'migrations');
const PREMIERE_MIGRATION_SOUMISE = '0076';
const ROLES_API = ['anon', 'authenticated', 'service_role'];

const IDENT = '(?:"[^"]+"|[a-zA-Z_][a-zA-Z0-9_]*)';
const RE_CREATION = new RegExp(
  '\\bcreate\\s+(?:unlogged\\s+)?(?:table|(?:materialized\\s+)?view)\\s+(?:if\\s+not\\s+exists\\s+)?' +
    '(' + IDENT + '(?:\\s*\\.\\s*' + IDENT + ')?)',
  'gi',
);

function retirerCommentaires(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** « public."Ma_Table" » -> { schema: 'public', nom: 'ma_table' } ; sans schéma = public. */
function decouperNom(brut) {
  const morceaux = brut.split('.').map((m) => m.trim().replace(/^"|"$/g, '').toLowerCase());
  if (morceaux.length === 1) return { schema: 'public', nom: morceaux[0] };
  return { schema: morceaux[morceaux.length - 2], nom: morceaux[morceaux.length - 1] };
}

/** Tables couvertes par un GRANT visant au moins un rôle de l'API (hors commentaires). */
function droitsAccordes(sqlPropre) {
  const tables = new Set();
  let toutes = false;
  for (const instruction of sqlPropre.split(';')) {
    if (!/^\s*grant\b/i.test(instruction)) continue;
    const m = instruction.match(/\bon\s+([\s\S]+?)\s+to\s+([\s\S]+)$/i);
    if (!m) continue;
    const roles = m[2].toLowerCase().split(/[\s,]+/);
    if (!ROLES_API.some((r) => roles.includes(r))) continue;
    const cible = m[1].trim();
    const toutesLesTables = cible.match(/^all\s+tables\s+in\s+schema\s+("?[\w]+"?)/i);
    if (toutesLesTables) {
      if (toutesLesTables[1].replace(/"/g, '').toLowerCase() === 'public') toutes = true;
      continue;
    }
    const sansMot = cible.replace(/^table\s+/i, '');
    if (/^(function|procedure|routine|sequence|schema|type|domain|language|database|all)\s/i.test(sansMot)) continue;
    for (const t of sansMot.split(',')) {
      const { schema, nom } = decouperNom(t);
      if (schema === 'public') tables.add(nom);
    }
  }
  return { tables, toutes };
}

/** Tables déclarées volontairement privées : `-- sans-grant: nom : raison`. */
function tablesDeclareesSansDroits(sqlBrut) {
  const noms = new Set();
  for (const m of sqlBrut.matchAll(/--\s*sans-grant\s*:\s*("[^"]+"|[\w.]+)/gi)) noms.add(decouperNom(m[1]).nom);
  return noms;
}

/** Noms des tables/vues de `public` créées par ce SQL sans droits ni exemption. */
function tablesSansDroits(sql) {
  const propre = retirerCommentaires(sql);
  const { tables, toutes } = droitsAccordes(propre);
  const exemptees = tablesDeclareesSansDroits(sql);
  const manquantes = [];
  for (const m of propre.matchAll(RE_CREATION)) {
    const { schema, nom } = decouperNom(m[1]);
    if (schema !== 'public') continue;
    if (toutes || tables.has(nom) || exemptees.has(nom)) continue;
    if (!manquantes.includes(nom)) manquantes.push(nom);
  }
  return manquantes;
}

function listerMigrations(dossier = DOSSIER_MIGRATIONS) {
  return fs.readdirSync(dossier).filter((f) => f.endsWith('.sql')).sort();
}

/** Sépare les infractions (migrations soumises à la règle) de l'héritage (plus anciennes). */
function auditer(fichiers, dossier = DOSSIER_MIGRATIONS) {
  const soumis = [];
  const historiques = [];
  for (const fichier of fichiers) {
    const tables = tablesSansDroits(fs.readFileSync(path.join(dossier, fichier), 'utf8'));
    if (tables.length === 0) continue;
    (fichier >= PREMIERE_MIGRATION_SOUMISE ? soumis : historiques).push({ fichier, tables });
  }
  return { soumis, historiques };
}

function afficherInfractions(soumis) {
  console.error('✗ Migration refusée : table(s) ou vue(s) créée(s) sans droits pour l’API de données.');
  for (const { fichier, tables } of soumis) console.error(`    ${fichier} : ${tables.join(', ')}`);
  console.error(
    [
      '',
      'Depuis le 30/10/2026, Supabase ne donne plus ces droits automatiquement. Dans la même migration :',
      '    grant select, insert, update, delete on public.<table> to service_role;',
      '    grant select, insert, update, delete on public.<table> to authenticated;',
      '(anon seulement si la table doit être lisible sans connexion). Si la table n’est volontairement',
      'pas exposée, le déclarer : « -- sans-grant: <table> : <raison> ».',
      'Modèle : supabase/MODELE_MIGRATION.sql. Rien n’a été appliqué.',
    ].join('\n'),
  );
}

/** À appeler avant toute connexion à la base : sort en erreur s'il y a une infraction. */
function controlerAvantApplication() {
  const { soumis } = auditer(listerMigrations());
  if (soumis.length === 0) return;
  afficherInfractions(soumis);
  process.exit(1);
}

/** Avertit (sans bloquer) quand des migrations historiques sans droits sont sur le point d'être jouées. */
function avertirHistorique(fichiersEnAttente) {
  const anciennes = fichiersEnAttente.filter((f) => f < PREMIERE_MIGRATION_SOUMISE);
  if (anciennes.length === 0) return;
  const { historiques } = auditer(anciennes);
  const nb = historiques.reduce((n, h) => n + h.tables.length, 0);
  if (nb === 0) return;
  console.warn(
    `⚠ ${nb} table(s) de migrations antérieures à la règle des droits n’ont aucun droit explicite. ` +
      'Sur une base créée après le 30/10/2026, elles seraient inaccessibles par l’API de données. ' +
      'Détail : node scripts/droits-migrations.js --historique',
  );
}

if (require.main === module) {
  const { soumis, historiques } = auditer(listerMigrations());
  if (soumis.length > 0) {
    afficherInfractions(soumis);
  } else {
    console.log(`✓ Aucune infraction : toutes les migrations à partir de ${PREMIERE_MIGRATION_SOUMISE} portent leurs droits.`);
  }
  const nbHistorique = historiques.reduce((n, h) => n + h.tables.length, 0);
  if (nbHistorique > 0) {
    console.log(`  ${nbHistorique} table(s) dans ${historiques.length} migration(s) antérieure(s) sans droit explicite (héritage, non bloquant).`);
    if (process.argv.includes('--historique')) {
      for (const { fichier, tables } of historiques) console.log(`    ${fichier} : ${tables.join(', ')}`);
    }
  }
  process.exit(soumis.length > 0 ? 1 : 0);
}

module.exports = {
  PREMIERE_MIGRATION_SOUMISE,
  tablesSansDroits,
  auditer,
  controlerAvantApplication,
  avertirHistorique,
};
