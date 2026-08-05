import { createClient as createServiceClient } from '@supabase/supabase-js';
import { normaliserNom } from '@/lib/fuzzyMatch';

/** Webhook Voiceflow (pense-bête #125, 05/08/2026) — vérifie qu'une ville
 *  dictée correspond à un lieu réel de pétanque luxembourgeois, pour la
 *  bonne orthographe plutôt qu'une recherche web à la volée (plus fiable
 *  et gratuit : on a déjà en base les vrais lieux via le calendrier
 *  fédération, alimenté saison après saison — cf. calendrier_federation).
 *
 *  Distance de Levenshtein simple plutôt que rapprocherNom() (fuzzyMatch.ts,
 *  pensé pour des noms prénom+nom) : une ville est un seul token, la
 *  logique prénom/nom/inversion ne s'applique pas ici.
 *
 *  Authentification : même secret partagé que verifier-licencie/route.ts
 *  (VOICEFLOW_WEBHOOK_SECRET). */

function distanceLevenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let precedente = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const courante = [i];
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1;
      courante[j] = Math.min(courante[j - 1] + 1, precedente[j] + 1, precedente[j - 1] + cout);
    }
    precedente = courante;
  }
  return precedente[b.length];
}

function similarite(a: string, b: string): number {
  if (!a || !b) return 0;
  const longueur = Math.max(a.length, b.length);
  return 1 - distanceLevenshtein(a, b) / longueur;
}

const SEUIL_CONFIANCE = 0.75;

export async function POST(requete: Request) {
  const secretAttendu = process.env.VOICEFLOW_WEBHOOK_SECRET;
  if (!secretAttendu) {
    return Response.json({ ok: false, error: 'VOICEFLOW_WEBHOOK_SECRET non configuré.' }, { status: 500 });
  }

  const corps = await requete.json().catch(() => null);
  if (!corps) return Response.json({ ok: false, error: 'Corps JSON invalide.' }, { status: 400 });

  const secretRecu =
    requete.headers.get('x-voiceflow-secret') ?? (corps as Record<string, unknown>)?.secret;
  if (secretRecu !== secretAttendu) {
    return Response.json({ ok: false, error: 'Secret invalide.' }, { status: 401 });
  }

  const { ville } = corps as { ville?: string };
  if (!ville || typeof ville !== 'string') {
    return Response.json({ ok: false, error: 'Paramètre "ville" manquant.' }, { status: 400 });
  }

  const supabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  const { data, error } = await supabase
    .from('calendrier_federation')
    .select('lieu')
    .eq('supprime', false)
    .not('lieu', 'is', null);
  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const lieuxConnus = Array.from(new Set((data ?? []).map((d) => d.lieu).filter(Boolean))) as string[];
  const dicteNormalise = normaliserNom(ville);

  const scores = lieuxConnus
    .map((lieu) => ({ lieu, score: similarite(dicteNormalise, normaliserNom(lieu)) }))
    .sort((a, b) => b.score - a.score);

  const meilleur = scores[0];
  if (!meilleur || meilleur.score < SEUIL_CONFIANCE) {
    return Response.json({ ok: true, trouve: false, candidats: scores.slice(0, 3).map((s) => s.lieu) });
  }

  return Response.json({ ok: true, trouve: true, ville: meilleur.lieu, score: meilleur.score });
}
