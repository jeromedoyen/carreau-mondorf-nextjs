import 'server-only';
import { Client } from 'pg';

/** Ping santé Supabase (retour Jérôme via /pb, 02/08/2026, note #122) : le
 *  plan gratuit met un projet en pause après une semaine sans activité
 *  détectée. La sauvegarde hebdomadaire (cron sauvegarde/, chaque lundi)
 *  couvre déjà l'essentiel, mais un ping séparé plus fréquent — ici tous
 *  les 3 jours — est plus sûr : indépendant d'une éventuelle panne côté
 *  Google Drive dans le flux de sauvegarde, et marge plus confortable
 *  avant le seuil de 7 jours. Une simple requête suffit, pas besoin de
 *  lire de vraies données. */
export async function GET(requete: Request) {
  const secret = process.env.CRON_SECRET;
  const recu = requete.headers.get('authorization');
  if (!secret || recu !== `Bearer ${secret}`) {
    return new Response('Non autorisé.', { status: 401 });
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    return Response.json({ ok: false, error: 'DATABASE_URL manquant.' }, { status: 500 });
  }

  const client = new Client({ connectionString: url });
  try {
    await client.connect();
    await client.query('select 1');
    return Response.json({ ok: true, verifieLe: new Date().toISOString() });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  } finally {
    await client.end();
  }
}
