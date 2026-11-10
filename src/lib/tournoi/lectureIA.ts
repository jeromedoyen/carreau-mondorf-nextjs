/**
 * Lecture d'une liste de participants par l'IA (photo ou PDF).
 *
 * Isolé de l'action serveur pour deux raisons : l'action exige d'être membre du
 * CA, ce qui rend la lecture impossible à essayer seule, et la tenue au délai
 * est LA fragilité de ce chemin — elle doit pouvoir se mesurer sans écran.
 *
 * Constat du 10/11/2026 : sur une photo de téléphone, `gemini-3.6-flash` avec
 * sa réflexion par défaut dépassait les 25 s allouées (18 s sur une image
 * propre de 59 Ko, dont la majeure partie à « réfléchir » 448 jetons pour en
 * écrire 166). La latence est irrégulière chez Google : la même lecture a pris
 * de 6 à 21 s, parfois plus de 25 s, et un appel sur quatre a reçu un refus
 * « high demand ». D'où :
 *   - réflexion coupée : recopier des noms n'est pas un raisonnement, et la
 *     lecture est identique (24 joueurs sur 24 dans tous les essais) ;
 *   - un second modèle en relais, pas un seul pari sur un plafond ;
 *   - `gemini-3.5-flash` d'abord : c'est le plus rapide mesuré ET il laisse
 *     intact le quota de `gemini-3.6-flash`, que se partagent Caro, la
 *     déclaration vocale, l'IA de déclaration de concours et la proposition
 *     d'équipe. Le relais ne tire sur ce quota qu'en cas d'échec du premier.
 *
 * Pas de course entre les deux modèles (les lancer ensemble et garder le plus
 * rapide) : ce serait deux requêtes par lecture sur une clé GRATUITE, dont les
 * plafonds sont serrés — le 10/11, des essais en rafale ont épuisé le quota
 * journalier de gemini-3.6-flash (réessai possible 22 h plus tard).
 */

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const SCHEMA = z.object({
  aDesEquipes: z
    .boolean()
    .describe('Vrai si le document regroupe les joueurs en équipes numérotées.'),
  equipes: z
    .array(
      z.object({
        numero: z
          .number()
          .int()
          .nullable()
          .describe("Numéro d'équipe tel qu'il figure sur le document, ou null."),
        joueurs: z.array(z.string()).describe("Noms des joueurs, tels qu'écrits."),
      }),
    )
    .describe(
      "Une entrée par équipe. Si le document est une simple liste de joueurs sans équipes, renvoyer une seule entrée avec numero null contenant tous les joueurs.",
    ),
});

export type LectureIA = z.infer<typeof SCHEMA>;

const INSTRUCTIONS = `Tu lis la liste des participants d'un concours de pétanque, photographiée ou scannée.

Recopie les noms EXACTEMENT tels qu'ils sont écrits : ne corrige pas l'orthographe, n'inverse pas prénom et nom, n'ajoute personne, n'invente rien.
Si une équipe est incomplète, renvoie seulement les joueurs présents.
Ignore les titres ("LES ÉQUIPES"), les numéros de page et tout ce qui n'est pas un nom de joueur.
Si une partie du document est manuscrite et que tu hésites sur un nom, recopie ta meilleure lecture — un humain relira tout derrière toi.`;

/**
 * Dans l'ordre d'essai. Le second prend le relais si le premier est muet,
 * surchargé, à bout de quota ou retiré du catalogue (gemini-2.5-flash l'a déjà
 * été : 404 « no longer available »).
 */
export const MODELES_LECTURE = ['gemini-3.5-flash', 'gemini-3.6-flash'] as const;

/** Plafond d'un essai. Un modèle muet ne doit pas manger tout le budget. */
export const DELAI_PAR_ESSAI_MS = 24_000;

/**
 * Budget de toute la lecture : sous `maxDuration` (60 s) de la page, avec de la
 * marge pour l'envoi de la photo et la réponse.
 */
export const BUDGET_TOTAL_MS = 48_000;

/** Un essai lancé avec moins que ça devant lui n'aurait aucune chance d'aboutir. */
const RESTE_MINI_MS = 4_000;

/**
 * Pourquoi la lecture a échoué — ce qui décide du message montré à l'organisateur :
 *   - `passager`   : trop lent ou surchargé, réessayer dans une minute a un sens ;
 *   - `quota-jour` : plafond journalier gratuit atteint, réessayer ne sert à rien
 *                    avant demain — mieux vaut orienter vers l'import Excel/CSV ;
 *   - `autre`      : une vraie erreur (clé refusée, modèle retiré…), montrée telle quelle.
 */
export type RaisonEchec = 'passager' | 'quota-jour' | 'autre';

export type ResultatLecture =
  | { ok: true; objet: LectureIA; modele: string; dureeMs: number }
  | { ok: false; raison: RaisonEchec; message: string };

type ErreurApi = { name?: string; statusCode?: number; message?: string; responseBody?: string };

function estDelai(e: unknown): boolean {
  return e instanceof Error && /^(Timeout|Abort)Error$/.test(e.name);
}

/** 429 dont le plafond atteint est celui de la JOURNÉE (le corps de la réponse le nomme). */
function estQuotaJour(e: unknown): boolean {
  return /PerDay/i.test((e as ErreurApi | null)?.responseBody ?? '');
}

/** Refus de surcharge ou de débit : 429/5xx, ou son message « high demand ». */
function estSurcharge(e: unknown): boolean {
  const x = e as ErreurApi | null;
  if (x?.statusCode && [429, 500, 502, 503, 504].includes(x.statusCode)) return true;
  return /high demand|overloaded|unavailable|try again later/i.test(x?.message ?? '');
}

const estPassager = (e: unknown) => estDelai(e) || (estSurcharge(e) && !estQuotaJour(e));

function qualifier(erreurs: unknown[]): { raison: RaisonEchec; message: string } {
  const tousPassagers = erreurs.length > 0 && erreurs.every(estPassager);
  if (tousPassagers) return { raison: 'passager', message: 'délai ou surcharge' };
  if (erreurs.length > 0 && erreurs.every((x) => estPassager(x) || estQuotaJour(x))) {
    return { raison: 'quota-jour', message: 'quota journalier atteint' };
  }
  const reelle = erreurs.find((x) => !estPassager(x) && !estQuotaJour(x)) ?? erreurs[0];
  return {
    raison: 'autre',
    message: reelle instanceof Error ? reelle.message : 'Lecture impossible.',
  };
}

export async function lireListeParIA(
  base64: string,
  mediaType: string,
  modeles: readonly string[] = MODELES_LECTURE,
  delaiEssaiMs: number = DELAI_PAR_ESSAI_MS,
  budgetMs: number = BUDGET_TOTAL_MS,
): Promise<ResultatLecture> {
  const fin = Date.now() + budgetMs;
  const erreurs: unknown[] = [];

  for (const modele of modeles) {
    const restant = fin - Date.now();
    if (restant < Math.min(RESTE_MINI_MS, delaiEssaiMs)) break;
    const debut = Date.now();
    try {
      const { object } = await generateObject({
        model: google(modele),
        schema: SCHEMA,
        abortSignal: AbortSignal.timeout(Math.min(delaiEssaiMs, restant)),
        // Le relais est notre propre boucle : un nouvel essai automatique du SDK
        // sur le même modèle mangerait le délai du suivant, et une requête de
        // plus sur un quota gratuit.
        maxRetries: 0,
        providerOptions: { google: { thinkingConfig: { thinkingBudget: 0 } } },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: INSTRUCTIONS },
              { type: 'file', data: base64, mediaType },
            ],
          },
        ],
      });
      return { ok: true, objet: object, modele, dureeMs: Date.now() - debut };
    } catch (e) {
      erreurs.push(e);
    }
  }

  return { ok: false, ...qualifier(erreurs) };
}
