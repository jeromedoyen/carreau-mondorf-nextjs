import { createClient as createServiceClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { schemaReponseClarification } from '@/lib/schemas/declarationVocale';
import { rapprocherNom, type Licencie } from '@/lib/fuzzyMatch';
import { extraireJetonAdresse } from '@/lib/declarationVocaleTraitement';

/** Réception des réponses aux e-mails de clarification d'une déclaration
 *  vocale de concours (Resend Inbound, événement `email.received`).
 *
 *  Le licencié répond en langage naturel à l'e-mail reçu ; sa réponse
 *  revient ici, le modèle en extrait ce qui manquait, et la déclaration
 *  est complétée sans qu'il ait eu à ouvrir l'application.
 *
 *  Corrélation par plus-addressing : l'e-mail de relance porte un
 *  Reply-To `concours+<jeton>@...`, et c'est ce jeton — présent dans le
 *  champ `to` de la réponse — qui identifie le dossier. Plus fiable qu'un
 *  marqueur dans l'objet, que les clients mail traduisent ou tronquent.
 *
 *  Authentification : secret partagé configuré côté Resend, vérifié ici
 *  (même approche que /api/webhooks/documenso). Route publique par nature :
 *  c'est le secret, pas l'URL, qui protège l'accès.
 *
 *  Pas de session utilisateur ici : le webhook agit avec la clé
 *  service-role, ce qui est précisément pourquoi la table
 *  declarations_vocales_clarification n'a aucune policy client. */

export const maxDuration = 60;

const RELANCES_MAX = 2;

/** Le corps du message n'est PAS dans la charge utile du webhook Resend —
 *  seules les métadonnées le sont. Il faut aller le chercher par l'API. */
async function recupererContenu(emailId: string): Promise<string> {
  const cle = process.env.RESEND_API_KEY;
  if (!cle) throw new Error('RESEND_API_KEY manquante.');
  const reponse = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${cle}` },
  });
  if (!reponse.ok) throw new Error(`Lecture du message impossible (${reponse.status}).`);
  const donnees = (await reponse.json()) as { text?: string; html?: string };
  return (donnees.text || donnees.html || '').trim();
}

/** Ne garde que ce que la personne vient d'écrire : les clients mail
 *  recitent tout le fil, et repasser l'e-mail d'origine au modèle lui
 *  ferait relire les questions comme si c'étaient des réponses. */
function couperCitation(corps: string): string {
  const marqueurs = [/^>/m, /^-{2,}\s*Message d'origine/im, /^Le .+ a écrit\s*:/im, /^On .+ wrote\s*:/im];
  let coupe = corps;
  for (const marqueur of marqueurs) {
    const trouve = marqueur.exec(coupe);
    if (trouve?.index) coupe = coupe.slice(0, trouve.index);
  }
  return coupe.trim();
}

export async function POST(requete: Request) {
  const secretAttendu = process.env.RESEND_WEBHOOK_SECRET;
  if (!secretAttendu) {
    return Response.json({ ok: false, error: 'RESEND_WEBHOOK_SECRET non configuré.' }, { status: 500 });
  }

  const corps = await requete.json().catch(() => null);
  if (!corps) return Response.json({ ok: false, error: 'Corps JSON invalide.' }, { status: 400 });

  const secretRecu = requete.headers.get('x-webhook-secret') ?? (corps as Record<string, unknown>)?.secret;
  if (secretRecu !== secretAttendu) {
    return Response.json({ ok: false, error: 'Secret invalide.' }, { status: 401 });
  }

  const donnees = ((corps as Record<string, unknown>).data ?? corps) as {
    email_id?: string;
    to?: string[] | string;
    text?: string;
  };
  const destinataires = Array.isArray(donnees.to) ? donnees.to.join(' ') : String(donnees.to ?? '');
  const jeton = extraireJetonAdresse(destinataires);
  if (!jeton) return Response.json({ ok: true, ignore: true, raison: 'Aucun jeton dans le destinataire.' });

  const supabase = createServiceClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

  const { data: dossier } = await supabase.rpc('dossier_clarification_par_jeton', { p_jeton: jeton });
  if (!dossier) return Response.json({ ok: true, ignore: true, raison: 'Dossier introuvable ou déjà résolu.' });

  let texte = donnees.text ?? '';
  if (!texte && donnees.email_id) {
    try {
      texte = await recupererContenu(donnees.email_id);
    } catch (e) {
      return Response.json({ ok: false, error: e instanceof Error ? e.message : 'Lecture impossible.' }, { status: 502 });
    }
  }
  texte = couperCitation(texte);
  if (!texte) return Response.json({ ok: true, ignore: true, raison: 'Réponse vide.' });

  const ambiguites = (dossier.ambiguites ?? []) as { champ: string; question: string }[];
  const extraitInitial = (dossier.donnees_extraites ?? {}) as Record<string, unknown>;

  const { object: reponse } = await generateObject({
    model: google('gemini-flash-latest'),
    schema: schemaReponseClarification,
    system: `Tu analyses la réponse d'un joueur de pétanque à un e-mail lui demandant de compléter sa déclaration de concours.
On lui a posé ces questions : ${ambiguites.map((a) => a.question).join(' | ')}
Extrait uniquement ce qu'il répond réellement. Ce qui n'est pas dit reste null (liste vide pour les partenaires).`,
    prompt: texte,
  });

  const { data: licenciesData } = await supabase.rpc('licencies_saison', { p_saison: dossier.saison });
  const licencies = ((licenciesData ?? []) as Licencie[]).filter((l) => l.id !== dossier.personne_declarant_id);

  const partenaireIds: number[] = [];
  const encoreAmbigus: string[] = [];
  for (const nom of reponse.partenaires) {
    const resultat = rapprocherNom(nom, licencies);
    if (resultat.trouve) {
      if (!partenaireIds.includes(resultat.licencie.id)) partenaireIds.push(resultat.licencie.id);
    } else {
      encoreAmbigus.push(nom);
    }
  }

  const club = reponse.club?.trim() || (extraitInitial.club as string | null) || null;

  // Le montant n'entre plus dans la complétude : une déclaration vocale est
  // remboursée au forfait par personne depuis la migration 0054.
  const complet = !!club && encoreAmbigus.length === 0;

  if (!complet) {
    const relances = (dossier.relances ?? 0) + 1;
    // Au-delà de la limite, on cesse de relancer : la trésorerie reprend
    // le dossier à la main plutôt que de boucler sur le licencié.
    const statut = relances >= RELANCES_MAX ? 'abandonne' : 'en_attente_reponse';
    await supabase
      .from('declarations_vocales_clarification')
      .update({ relances, statut, reponse_brute: texte, reponse_recue_le: new Date().toISOString() })
      .eq('jeton', jeton);
    return Response.json({ ok: true, statut, encoreAmbigus });
  }

  // Complet : les lignes déjà créées passent en 'en_attente' (payables), et
  // les partenaires nouvellement identifiés sont ajoutés à l'équipe.
  const ids = (dossier.participations_ids ?? []) as number[];
  if (ids.length) {
    await supabase.from('participations_concours').update({ statut: 'en_attente', club }).in('id', ids);
  }

  const { data: existantes } = await supabase
    .from('participations_concours')
    .select('personne_id')
    .in('id', ids.length ? ids : [-1]);
  const dejaPresents = new Set((existantes ?? []).map((l) => l.personne_id as number));

  const manquants = partenaireIds.filter((id) => !dejaPresents.has(id));
  if (manquants.length) {
    const modele = {
      saison: dossier.saison,
      type: 'Concours',
      source: 'vocal',
      chef_equipe_id: dossier.personne_declarant_id,
      date: (extraitInitial.date as string) ?? new Date().toISOString().slice(0, 10),
      club,
      pays: 'LU',
      hors_calendrier: (extraitInitial.horsCalendrier as boolean) ?? true,
      hors_pays: false,
      statut: 'en_attente',
      transcript: dossier.transcript,
      donnees_extraites: extraitInitial,
      photo_equipe_chemin: dossier.photo_equipe_chemin,
      notes: 'Déclaré au vocal — complété par e-mail',
    };
    await supabase
      .from('participations_concours')
      .insert(manquants.map((personneId) => ({ ...modele, personne_id: personneId })));
  }

  await supabase
    .from('declarations_vocales_clarification')
    .update({
      statut: 'resolu',
      reponse_brute: texte,
      reponse_recue_le: new Date().toISOString(),
      relances: (dossier.relances ?? 0) + 1,
    })
    .eq('jeton', jeton);

  return Response.json({ ok: true, statut: 'resolu', partenairesAjoutes: manquants.length });
}
