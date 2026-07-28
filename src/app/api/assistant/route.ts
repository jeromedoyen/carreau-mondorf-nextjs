import {
  streamText,
  tool,
  isStepCount,
  type UIMessage,
  convertToModelMessages,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { PROMPT_SYSTEME_ASSISTANT } from '@/lib/assistantPrompt';
import { getMeteoDuJour } from '@/lib/meteo';
import { getSaisonActive } from '@/lib/saisons';
import { createClient } from '@/lib/supabase/server';
import { chargerBaseConnaissance } from '@/lib/baseConnaissance';

const LIMITE_MESSAGES_PAR_JOUR = 40;

function texteDernierMessageUtilisateur(messages: UIMessage[]): string {
  const dernier = [...messages].reverse().find((m) => m.role === 'user');
  if (!dernier) return '';
  return dernier.parts.map((p) => (p.type === 'text' ? p.text : '')).join(' ').trim();
}

/** Assistant "Caro" (28/07/2026, demande Jérôme) — réservé aux licenciés
 *  connectés (même garde que le reste de l'app licencié,
 *  estUtilisateurAutorise()) pour limiter l'usage aux vrais membres, pas
 *  pour restreindre l'information elle-même (le prompt système ne contient
 *  que des indications de navigation, rien de confidentiel). Modèle Gemini
 *  Flash — palier gratuit Google AI Studio, largement suffisant pour ce
 *  volume d'usage. `stopWhen: isStepCount(3)` : les outils doivent pouvoir
 *  renvoyer leur résultat au modèle pour qu'il le commente, pas juste
 *  s'arrêter après l'appel (comportement par défaut).
 *
 *  Deux garde-fous ajoutés le même jour : une limite de {@link
 *  LIMITE_MESSAGES_PAR_JOUR} messages/jour/personne (RPC
 *  verifier_et_incrementer_usage_assistant, migration 0040 — protège le
 *  palier gratuit si l'usage devient intensif) et un journal des
 *  questions posées (RPC journaliser_question_assistant, même migration —
 *  sert de diagnostic UX pour le CA, cf. /outils/assistant-questions).
 *
 *  Outil `mesInformations` (28/07/2026, demande Jérôme) : réutilise les RPC
 *  security definer déjà existantes pour Mon Caro (mon_identite,
 *  mon_adhesion, migrations 0026/0039) — scopées à la session courante côté
 *  base, jamais un accès élargi au registre. Caro ne peut donc physiquement
 *  pas répondre sur les données de quelqu'un d'autre, RLS oblige.
 *
 *  BASE_CONNAISSANCE_FONCTIONNALITES.md injecté dans le prompt système
 *  (28/07/2026, demande Jérôme : "permet à Caro d'y avoir accès pour
 *  améliorer les réponses") — le document est écrit précisément pour cet
 *  usage (structure Route/Accès/Objectif/Description/Actions, homogène
 *  page par page). Doit rester à jour à chaque changement de page/outil
 *  (voir CLAUDE.md) pour ne pas faire dériver les réponses de Caro. */
export async function POST(requete: Request) {
  if (!(await estUtilisateurAutorise())) {
    return new Response('Réservé aux licenciés connectés.', { status: 401 });
  }

  const supabase = await createClient();

  const { data: sousLaLimite } = await supabase.rpc('verifier_et_incrementer_usage_assistant', {
    p_limite: LIMITE_MESSAGES_PAR_JOUR,
  });
  if (sousLaLimite === false) {
    return new Response(
      "Tu as atteint la limite de messages pour aujourd'hui avec Caro — réessaie demain, ou contacte directement le comité.",
      { status: 429 }
    );
  }

  const { messages }: { messages: UIMessage[] } = await requete.json();

  const question = texteDernierMessageUtilisateur(messages);
  if (question) await supabase.rpc('journaliser_question_assistant', { p_question: question });

  const systeme = `${PROMPT_SYSTEME_ASSISTANT}

---

Voici une base de connaissance détaillée, page par page, de l'application — utilise-la comme source de référence pour toute question sur ce que fait une fonctionnalité précise (elle est plus détaillée que le résumé ci-dessus, fais-lui confiance en priorité en cas d'écart) :

${chargerBaseConnaissance()}`;

  const result = streamText({
    model: google('gemini-flash-latest'),
    system: systeme,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(3),
    tools: {
      meteo: tool({
        description: 'Donne la météo du jour à Mondorf-les-Bains (température, min/max, probabilité de pluie).',
        inputSchema: z.object({}),
        execute: async () => getMeteoDuJour(),
      }),
      mesInformations: tool({
        description:
          "Donne les informations personnelles de la personne actuellement connectée : prénom, nom, statut de cotisation et de licence pour la saison en cours. Utilise cet outil pour toute question sur SES propres données (\"ai-je payé ma cotisation ?\", \"suis-je licencié ?\"...) — jamais une réponse inventée.",
        inputSchema: z.object({}),
        execute: async () => {
          const saison = await getSaisonActive();
          const [{ data: identite }, { data: adhesion }] = await Promise.all([
            supabase.rpc('mon_identite'),
            supabase.rpc('mon_adhesion', { p_saison: saison }),
          ]);
          if (!identite) return { trouve: false };
          return {
            trouve: true,
            prenom: identite.prenom ?? null,
            saison,
            adhesion: adhesion
              ? {
                  type: adhesion.type,
                  categorie: adhesion.categorie,
                  cotisationPayee: adhesion.cotisation_payee,
                  cotisationDate: adhesion.cotisation_date,
                  licencePayee: adhesion.licence_payee,
                  licenceDate: adhesion.licence_date,
                }
              : null,
          };
        },
      }),
    },
  });

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
