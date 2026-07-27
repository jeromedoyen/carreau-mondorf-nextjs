import { genererInstantaneBaseDonnees } from '@/lib/backup';
import { televerserSauvegarde } from '@/lib/googleDrive';

/** Déclenchée par Vercel Cron (vercel.json, chaque lundi 5h UTC — même
 *  cadence que sauvegarderClasseur() en v1). Route HTTP publique par
 *  nature chez Vercel : la garde CRON_SECRET est ce qui empêche un tiers de
 *  la déclencher à la demande (Vercel ajoute automatiquement l'en-tête
 *  Authorization sur ses propres appels quand CRON_SECRET est défini côté
 *  projet — cf. doc Vercel Cron Jobs). */
export async function GET(requete: Request) {
  const secret = process.env.CRON_SECRET;
  const recu = requete.headers.get('authorization');
  if (!secret || recu !== `Bearer ${secret}`) {
    return new Response('Non autorisé.', { status: 401 });
  }

  try {
    const contenu = await genererInstantaneBaseDonnees();
    const horodatage = new Date().toISOString().replace(/[:.]/g, '-');
    const { fileId } = await televerserSauvegarde({
      nomFichier: `sauvegarde-${horodatage}.json`,
      contenu,
    });
    return Response.json({ ok: true, fileId, taille: contenu.length });
  } catch (e) {
    return Response.json({ ok: false, error: (e as Error).message }, { status: 500 });
  }
}
