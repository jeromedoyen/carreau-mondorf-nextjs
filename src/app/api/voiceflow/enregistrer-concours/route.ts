import { createClient as createServiceClient } from '@supabase/supabase-js';
import { creerLignesParticipation, type DonneesParticipationEquipe } from '@/lib/participationsConcours';

/** Webhook Voiceflow — dernière étape du flow de déclaration assistée par
 *  IA (pense-bête #125) : enregistre réellement la participation, une fois
 *  ville et partenaires vérifiés via verifier-ville/verifier-licencie.
 *
 *  `chefEquipeId` doit être injecté comme variable Voiceflow au lancement
 *  de la conversation (launch payload), PAS demandé au déclarant — il ne
 *  faut jamais faire confiance à un id fourni en cours de route par le
 *  client, même principe que creerLignesParticipation() l'exige déjà pour
 *  les Server Actions. C'est la page /concours/declarer-ia (déjà gardée
 *  par estUtilisateurAutorise()) qui connaît ce chef_equipe_id côté
 *  serveur et doit le transmettre au widget à l'initialisation — pas
 *  encore fait, cf. résumé de session : reste à embarquer le widget et
 *  câbler cette injection.
 *
 *  Réutilise creerLignesParticipation() (partagé avec /concours et la
 *  déclaration vocale) pour ne jamais dupliquer la règle anti-doublon —
 *  le cast est sûr : la fonction n'utilise que .from()/.select()/.insert(),
 *  disponibles à l'identique sur le client service role. */
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

  const { chefEquipeId, saison, date, club, partenaireIds } = corps as {
    chefEquipeId?: number;
    saison?: string;
    date?: string;
    club?: string;
    partenaireIds?: number[];
  };

  if (!chefEquipeId || !date || !club?.trim()) {
    return Response.json({ ok: false, error: 'chefEquipeId, date et club sont obligatoires.' }, { status: 400 });
  }

  const supabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  let saisonActive: string;
  if (saison) {
    saisonActive = saison;
  } else {
    const { data, error } = await supabase.from('saisons').select('libelle').eq('active', true).single();
    if (error || !data) return Response.json({ ok: false, error: 'Aucune saison active.' }, { status: 500 });
    saisonActive = data.libelle;
  }

  const donnees: DonneesParticipationEquipe = {
    saison: saisonActive,
    date,
    club: club.trim(),
    pays: 'LU',
    horsCalendrier: false,
    horsPays: false,
    inscriptionMontant: null,
    repasInclus: false,
    partenaireIds: partenaireIds ?? [],
    source: 'vocal',
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const resultat = await creerLignesParticipation(supabase as any, chefEquipeId, donnees);

  if (!resultat.ok) {
    return Response.json({ ok: false, error: resultat.error }, { status: 400 });
  }
  return Response.json({ ok: true, ids: resultat.ids });
}
