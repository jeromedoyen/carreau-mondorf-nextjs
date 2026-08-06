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
import { getSaisonActive } from '@/lib/saisons';
import { createClient } from '@/lib/supabase/server';
import { rapprocherNom } from '@/lib/fuzzyMatch';
import { creerLignesParticipation, type DonneesParticipationEquipe } from '@/lib/participationsConcours';

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
function similariteTexte(a: string, b: string): number {
  if (!a || !b) return 0;
  return 1 - distanceLevenshtein(a, b) / Math.max(a.length, b.length);
}
function normalise(t: string): string {
  return t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Déclaration de concours assistée par IA (pense-bête #125, 05/08/2026)
 *  — abandon de la piste Voiceflow (trop complexe à configurer pour
 *  Jérôme, retour du 05/08/2026) au profit d'une implémentation directe
 *  dans l'app, même technique que l'assistant Caro (/api/assistant) :
 *  Gemini + tool calling, micro/lecture vocale via Web Speech API côté
 *  client (gratuit, déjà éprouvé). Bouton "Déclarer à l'aide de l'IA" sur
 *  /concours pointe vers /concours/declarer-ia (ConcoursIaChat.tsx).
 *
 *  Contrairement à l'approche webhook envisagée avec Voiceflow,
 *  chef_equipe_id vient directement de la session (mon_id_personne()) —
 *  pas besoin de l'injecter manuellement, plus simple et plus sûr.
 *
 *  Outils : vérifierVille (contre calendrier_federation.lieu, pas de
 *  recherche web), chercherLicencie (réutilise rapprocherNom() —
 *  fuzzyMatch.ts — déjà éprouvé par la déclaration au vocal), et
 *  enregistrerDeclaration (réutilise creerLignesParticipation(), partagé
 *  avec /concours et la déclaration vocale — même règle anti-doublon). */
export async function POST(requete: Request) {
  if (!(await estUtilisateurAutorise())) {
    return new Response('Réservé aux licenciés connectés.', { status: 401 });
  }

  const supabase = await createClient();
  const { data: monId } = await supabase.rpc('mon_id_personne');
  if (!monId) {
    return new Response('Aucune fiche licencié trouvée pour ta session — contacte le comité.', { status: 403 });
  }

  const { messages }: { messages: UIMessage[] } = await requete.json();
  const saison = await getSaisonActive();

  const systeme = `Tu es l'assistant vocal de déclaration de concours du club de pétanque Carreau Mondorf.
Ton unique rôle : aider un licencié à déclarer sa participation à un concours extérieur, en tant que chef d'équipe.

Déroule STRICTEMENT cet ordre, une question à la fois, ton chaleureux et bref (réponses courtes, c'est lu à voix haute) :

1. Accueille brièvement, demande la ville où s'est déroulé le concours.
2. Dès que le licencié donne une ville, appelle l'outil vérifierVille.
   - Si trouvée directement : passe à l'étape suivante.
   - Si non trouvée : propose le candidat connu le plus proche renvoyé par l'outil ("Tu veux dire [candidat] ?"). S'il confirme, utilise ce nom-là.
   - S'il refuse tous les candidats proposés (ville vraiment inconnue de nos données, ex. concours à l'étranger ou nouveau lieu) : redemande-lui de confirmer clairement le nom exact une seconde fois, puis accepte-le tel quel — ne bloque jamais indéfiniment la déclaration pour une ville légitime absente de nos données.
3. Demande si c'était un concours en tête-à-tête, doublette ou triplette.
4. Selon la réponse : 0 partenaire (tête-à-tête), 1 partenaire (doublette), 2 partenaires (triplette). Pour chaque partenaire, demande son nom puis appelle chercherLicencie. Si non trouvé ou ambigu, redemande le nom. Remercie une fois trouvé.
5. Demande la date du concours (accepte une date approximative, ex. "samedi dernier" — demande de préciser le jour/mois si vraiment trop vague).
6. Une fois ville, type de partie, partenaires (si besoin) et date réunis, appelle enregistrerDeclaration.
7. Confirme brièvement l'enregistrement, remercie, termine.

Règles :
- Ne jamais inventer un nom de ville ou de licencié — toujours vérifier via les outils.
- Une seule question à la fois, jamais plusieurs d'un coup.
- Si le licencié dit quelque chose hors sujet, ramène poliment à la déclaration en cours.
- Saison en cours : ${saison}.`;

  const result = streamText({
    model: google('gemini-flash-latest'),
    system: systeme,
    messages: await convertToModelMessages(messages),
    stopWhen: isStepCount(4),
    tools: {
      verifierVille: tool({
        description: 'Vérifie qu\'une ville dictée correspond à un lieu réel de pétanque luxembourgeois déjà connu.',
        inputSchema: z.object({ ville: z.string() }),
        execute: async ({ ville }) => {
          const { data } = await supabase
            .from('calendrier_federation')
            .select('lieu')
            .eq('supprime', false)
            .not('lieu', 'is', null);
          const lieux = Array.from(new Set((data ?? []).map((d) => d.lieu).filter(Boolean))) as string[];
          const cible = normalise(ville);
          const scores = lieux
            .map((l) => ({ lieu: l, score: similariteTexte(cible, normalise(l)) }))
            .sort((a, b) => b.score - a.score);
          const meilleur = scores[0];
          if (!meilleur || meilleur.score < 0.72) {
            return { trouve: false, candidats: scores.slice(0, 3).map((s) => s.lieu) };
          }
          return { trouve: true, ville: meilleur.lieu };
        },
      }),
      chercherLicencie: tool({
        description: "Vérifie qu'un nom de partenaire dicté correspond à un licencié réel du club pour la saison en cours.",
        inputSchema: z.object({ nom: z.string() }),
        execute: async ({ nom }) => {
          const { data: licencies } = await supabase.rpc('licencies_saison', { p_saison: saison });
          const resultat = rapprocherNom(nom, licencies ?? []);
          if (resultat.trouve) {
            return { trouve: true, id: resultat.licencie.id, prenom: resultat.licencie.prenom, nom: resultat.licencie.nom };
          }
          return { trouve: false, candidats: resultat.candidats.map((c) => `${c.prenom} ${c.nom}`) };
        },
      }),
      enregistrerDeclaration: tool({
        description: 'Enregistre la déclaration une fois ville, type de partie, partenaires (si besoin) et date confirmés.',
        inputSchema: z.object({
          date: z.string().describe('Date au format YYYY-MM-DD'),
          club: z.string().describe('La ville/lieu du concours, déjà vérifiée'),
          partenaireIds: z.array(z.number()).describe('IDs des partenaires déjà vérifiés, vide si tête-à-tête'),
        }),
        execute: async ({ date, club, partenaireIds }) => {
          const donnees: DonneesParticipationEquipe = {
            saison,
            date,
            club,
            pays: 'LU',
            horsCalendrier: false,
            horsPays: false,
            inscriptionMontant: null,
            repasInclus: false,
            partenaireIds,
            source: 'vocal',
          };
          const resultat = await creerLignesParticipation(supabase, monId, donnees);
          return resultat;
        },
      }),
    },
  });

  return createUIMessageStreamResponse({ stream: toUIMessageStream({ stream: result.stream }) });
}
