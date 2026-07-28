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
import { createClient } from '@/lib/supabase/server';

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
 *  volume d'usage. `stopWhen: isStepCount(3)` : l'outil météo doit pouvoir
 *  renvoyer son résultat au modèle pour qu'il le commente, pas juste
 *  s'arrêter après l'appel d'outil (comportement par défaut).
 *
 *  Deux garde-fous ajoutés le même jour : une limite de {@link
 *  LIMITE_MESSAGES_PAR_JOUR} messages/jour/personne (RPC
 *  verifier_et_incrementer_usage_assistant, migration 0040 — protège le
 *  palier gratuit si l'usage devient intensif) et un journal des
 *  questions posées (RPC journaliser_question_assistant, même migration —
 *  sert de diagnostic UX pour le CA, cf. /outils/assistant-questions). */
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

  const result = streamText({
    model: google('gemini-flash-latest'),
    system: PROMPT_SYSTEME_ASSISTANT,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(3),
    tools: {
      meteo: tool({
        description: 'Donne la météo du jour à Mondorf-les-Bains (température, min/max, probabilité de pluie).',
        inputSchema: z.object({}),
        execute: async () => getMeteoDuJour(),
      }),
    },
  });

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
