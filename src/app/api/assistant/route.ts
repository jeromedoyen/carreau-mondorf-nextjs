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

/** Assistant "Caro" (28/07/2026, demande Jérôme) — réservé aux licenciés
 *  connectés (même garde que le reste de l'app licencié,
 *  estUtilisateurAutorise()) pour limiter l'usage aux vrais membres, pas
 *  pour restreindre l'information elle-même (le prompt système ne contient
 *  que des indications de navigation, rien de confidentiel). Modèle Gemini
 *  Flash — palier gratuit Google AI Studio, largement suffisant pour ce
 *  volume d'usage. `stopWhen: isStepCount(3)` : l'outil météo doit pouvoir
 *  renvoyer son résultat au modèle pour qu'il le commente, pas juste
 *  s'arrêter après l'appel d'outil (comportement par défaut). */
export async function POST(requete: Request) {
  if (!(await estUtilisateurAutorise())) {
    return new Response('Réservé aux licenciés connectés.', { status: 401 });
  }

  const { messages }: { messages: UIMessage[] } = await requete.json();

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
