#!/usr/bin/env node
/**
 * Applique les migrations SQL en attente directement sur la base de
 * données, via une connexion Postgres directe (DATABASE_URL dans
 * .env.local) — mis en place le 27/07/2026 à la demande de Jérôme
 * ("perte de temps que je fasse le travail [d'aller coller le SQL dans
 * l'éditeur Supabase]").
 *
 * Table de suivi `_migrations_appliquees` (créée au premier lancement) :
 * enregistre quel fichier a été appliqué et quand, pour ne jamais
 * réappliquer une migration déjà passée. Les migrations 0001 à 0026 ont
 * toutes été appliquées manuellement par Jérôme via l'éditeur SQL Supabase
 * avant la mise en place de cet outil — `--marquer-appliquees` les
 * enregistre dans la table de suivi SANS les exécuter (elles existent déjà
 * en base), pour amorcer le suivi sans tout rejouer.
 *
 * Usage :
 *   node scripts/appliquer-migrations.js                  applique les migrations en attente (.env.local)
 *   node scripts/appliquer-migrations.js --sec             idem
 *   node scripts/appliquer-migrations.js --marquer-appliquees 0001..0026   marque une plage comme déjà appliquée, sans exécuter
 *   node scripts/appliquer-migrations.js --env-fichier .env.test.local     cible un autre fichier d'env (ex. base de test) plutôt que .env.local
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const DOSSIER_MIGRATIONS = path.join(__dirname, '..', 'supabase', 'migrations');

function chargerDatabaseUrl() {
  const envFichierIdx = process.argv.indexOf('--env-fichier');
  const nomFichier = envFichierIdx !== -1 ? process.argv[envFichierIdx + 1] : '.env.local';
  const envPath = path.join(__dirname, '..', nomFichier);
  const contenu = fs.readFileSync(envPath, 'utf8');
  const ligne = contenu.split('\n').find((l) => l.startsWith('DATABASE_URL='));
  if (!ligne) throw new Error(`DATABASE_URL absent de ${nomFichier}`);
  return ligne.slice('DATABASE_URL='.length).trim();
}

async function assurerTableSuivi(client) {
  await client.query(`
    create table if not exists public._migrations_appliquees (
      id bigint generated always as identity primary key,
      nom_fichier text not null unique,
      appliquee_le timestamptz not null default now()
    );
  `);
}

async function migrationsDejaAppliquees(client) {
  const { rows } = await client.query('select nom_fichier from public._migrations_appliquees');
  return new Set(rows.map((r) => r.nom_fichier));
}

async function main() {
  const url = chargerDatabaseUrl();
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  await assurerTableSuivi(client);

  const marqueurIdx = process.argv.indexOf('--marquer-appliquees');
  const fichiers = fs.readdirSync(DOSSIER_MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  const dejaAppliquees = await migrationsDejaAppliquees(client);

  if (marqueurIdx !== -1) {
    const plage = process.argv[marqueurIdx + 1];
    const [debut, fin] = plage.split('..');
    for (const fichier of fichiers) {
      const numero = fichier.slice(0, 4);
      if (numero >= debut && numero <= fin && !dejaAppliquees.has(fichier)) {
        await client.query('insert into public._migrations_appliquees (nom_fichier) values ($1)', [fichier]);
        console.log(`Marquée (déjà en base, non exécutée) : ${fichier}`);
      }
    }
    await client.end();
    return;
  }

  const enAttente = fichiers.filter((f) => !dejaAppliquees.has(f));
  if (enAttente.length === 0) {
    console.log('Aucune migration en attente — base à jour.');
    await client.end();
    return;
  }

  for (const fichier of enAttente) {
    const sql = fs.readFileSync(path.join(DOSSIER_MIGRATIONS, fichier), 'utf8');
    console.log(`Application de ${fichier}...`);
    try {
      await client.query('begin');
      await client.query(sql);
      await client.query('insert into public._migrations_appliquees (nom_fichier) values ($1)', [fichier]);
      await client.query('commit');
      console.log(`  ✓ ${fichier} appliquée`);
    } catch (e) {
      await client.query('rollback');
      console.error(`  ✗ ${fichier} a échoué : ${e.message}`);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log('Terminé.');
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
