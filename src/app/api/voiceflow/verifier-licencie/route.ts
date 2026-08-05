import { createClient as createServiceClient } from '@supabase/supabase-js';
import { rapprocherNom } from '@/lib/fuzzyMatch';

/** Webhook pour le flux Voiceflow de déclaration de concours assistée par
 *  IA (pense-bête #125, 05/08/2026 — bouton déjà en place sur /concours,
 *  page d'attente sur /concours/declarer-ia en attendant que le flux
 *  Voiceflow soit prêt côté Jérôme).
 *
 *  Voiceflow appelle cette route à l'étape API de son flow chaque fois que
 *  le déclarant dicte un nom de partenaire — réutilise rapprocherNom()
 *  (fuzzyMatch.ts), déjà éprouvé pour la déclaration au vocal existante
 *  (/concours/declarer-vocal). Même principe : on ne devine jamais, un
 *  score sous le seuil ou une ambiguïté entre deux licenciés renvoie
 *  `trouve: false` pour que le flow Voiceflow puisse redemander plutôt
 *  que d'attribuer la partie au mauvais licencié.
 *
 *  Authentification : secret partagé VOICEFLOW_WEBHOOK_SECRET, même
 *  principe que /api/webhooks/documenso (en-tête X-Voiceflow-Secret ou
 *  champ `secret` du corps) — route publique par nature, c'est ce secret
 *  qui protège l'accès. À configurer dans l'étape API du flow Voiceflow. */
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

  const { nom, saison } = corps as { nom?: string; saison?: string };
  if (!nom || typeof nom !== 'string') {
    return Response.json({ ok: false, error: 'Paramètre "nom" manquant.' }, { status: 400 });
  }

  const supabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  let saisonActive: string;
  if (saison) {
    saisonActive = saison;
  } else {
    const { data, error } = await supabase.from('saisons').select('libelle').eq('active', true).single();
    if (error || !data) {
      return Response.json({ ok: false, error: 'Aucune saison active.' }, { status: 500 });
    }
    saisonActive = data.libelle;
  }

  const { data: licencies, error: errLicencies } = await supabase.rpc('licencies_saison', {
    p_saison: saisonActive,
  });
  if (errLicencies) {
    return Response.json({ ok: false, error: errLicencies.message }, { status: 500 });
  }

  const resultat = rapprocherNom(nom, licencies ?? []);

  if (resultat.trouve) {
    return Response.json({
      ok: true,
      trouve: true,
      licencie: { id: resultat.licencie.id, nom: resultat.licencie.nom, prenom: resultat.licencie.prenom },
      score: resultat.score,
    });
  }

  return Response.json({
    ok: true,
    trouve: false,
    raison: resultat.raison,
    candidats: resultat.candidats.map((c) => `${c.prenom} ${c.nom}`),
  });
}
