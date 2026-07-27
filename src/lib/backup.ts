import 'server-only';
import { Client } from 'pg';

/** Instantané JSON complet de la base (27/07/2026, suite audit sécurité —
 *  le plan Supabase gratuit ne fait AUCUNE sauvegarde, `pitr_enabled: false`
 *  et `backups: []` confirmés via l'API Management). Connexion directe
 *  Postgres (DATABASE_URL, même variable que scripts/appliquer-migrations.js)
 *  plutôt que le client Supabase : on veut TOUTES les lignes de TOUTES les
 *  tables, RLS ou pas — un dump doit ignorer les policies, pas les respecter.
 *  Liste des tables lue dynamiquement (information_schema) pour ne jamais
 *  désynchroniser ce fichier d'une migration qui ajoute une table. */
export async function genererInstantaneBaseDonnees(): Promise<Buffer> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquant.');

  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const { rows: tables } = await client.query<{ table_name: string }>(
      `select table_name from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE'
       order by table_name`
    );

    const donnees: Record<string, unknown[]> = {};
    for (const { table_name: nomTable } of tables) {
      const { rows } = await client.query(`select * from "${nomTable}"`);
      donnees[nomTable] = rows;
    }

    const instantane = {
      genereLe: new Date().toISOString(),
      tables: donnees,
    };
    return Buffer.from(JSON.stringify(instantane));
  } finally {
    await client.end();
  }
}
