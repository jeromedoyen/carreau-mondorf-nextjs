import { estMembreCA } from '@/lib/membres';
import { echangerCodeContreJetons } from '@/lib/googleDrive';

/** Callback OAuth Google (Phase 3, 27/07/2026) — affiche le refresh_token
 *  obtenu pour que le CA le colle lui-même dans les variables d'env
 *  (.env.local + Vercel), jamais stocké automatiquement nulle part :
 *  cette appli n'a pas de table dédiée aux jetons externes, et un seul
 *  jeton pour tout le club n'a pas besoin de plus qu'une variable d'env. */
export async function GET(requete: Request) {
  if (!(await estMembreCA())) {
    return new Response('Réservé au comité.', { status: 403 });
  }

  const code = new URL(requete.url).searchParams.get('code');
  if (!code) {
    return new Response('Code d’autorisation manquant.', { status: 400 });
  }

  try {
    const { refreshToken } = await echangerCodeContreJetons(code);
    return new Response(
      `<!doctype html><html><body style="font-family:sans-serif;max-width:640px;margin:40px auto;line-height:1.6;">
        <h1>Connexion Google Drive réussie</h1>
        <p>Copie cette valeur dans <code>GOOGLE_REFRESH_TOKEN</code> (.env.local puis Vercel) :</p>
        <textarea readonly style="width:100%;height:80px;font-family:monospace;">${refreshToken}</textarea>
        <p>Tu peux fermer cette page une fois copiée.</p>
      </body></html>`,
      { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
  } catch (e) {
    return new Response(`Échec : ${(e as Error).message}`, { status: 500 });
  }
}
