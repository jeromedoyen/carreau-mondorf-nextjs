/** Réveil anticipé de l'instance Documenso auto-hébergée sur Render
 *  (04/08/2026, demande Jérôme — même besoin que api/cron/sante pour
 *  Supabase : éviter le cold start au moment où quelqu'un a réellement
 *  besoin du service). Appelée côté client (fetch fire-and-forget) à
 *  l'arrivée sur les pages Manifestations et au clic sur "Valider et
 *  signer" — jamais côté serveur au chargement, pour ne réveiller que
 *  quand un humain est réellement sur le point d'en avoir besoin. Pas
 *  d'auth (contrairement à cron/sante qui tourne sans utilisateur) : une
 *  simple requête GET suffit à sortir l'instance de veille, le contenu de
 *  la réponse n'a aucune importance. */
export async function GET() {
  const url = process.env.DOCUMENSO_API_URL;
  if (!url) return Response.json({ ok: false });

  try {
    await fetch(url, { cache: 'no-store' });
  } catch {
    // Best-effort : une erreur ici (cold start justement en cours,
    // timeout...) ne doit jamais remonter à l'utilisateur.
  }
  return Response.json({ ok: true });
}
