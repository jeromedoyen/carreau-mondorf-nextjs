'use server';

import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { rapprocherNom, type Licencie } from '@/lib/fuzzyMatch';
import { analyserTexte, type EntreeImport } from '@/lib/tournoi/import';

/**
 * Une ligne prête pour l'écran de correction : ce que le fichier ou la photo a
 * donné, plus la proposition de rapprochement avec le registre du club.
 *
 * `statut` dit à l'organisateur ce qu'il doit regarder :
 *   - `trouve`  : un licencié correspond nettement, la ligne est pré-remplie ;
 *   - `ambigu`  : plusieurs homonymes plausibles, il faut choisir ;
 *   - `inconnu` : personne ne correspond — invité, ou nom mal lu.
 */
export type LigneImport = {
  nomLu: string;
  equipeDepart: number | null;
  personneId: number | null;
  nomRegistre: string | null;
  statut: 'trouve' | 'ambigu' | 'inconnu';
  candidats: { id: number; nom: string }[];
};

type Resultat<T> = { ok: true; donnees: T } | { ok: false; error: string };

async function contexteCA() {
  const supabase = await createClient();
  const { data } = await supabase.rpc('est_membre_ca');
  return { supabase, ca: !!data };
}

async function chargerRegistre(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Licencie[]> {
  const { data } = await supabase
    .from('personnes')
    .select('id, nom, prenom')
    .eq('supprime', false);
  return (data ?? []).map((p) => ({
    id: p.id as number,
    nom: (p.nom as string) ?? '',
    prenom: (p.prenom as string) ?? '',
  }));
}

/**
 * Rapproche des noms lus du registre du club. Réutilise `rapprocherNom()`
 * (fuzzyMatch), qui refuse délibérément de trancher entre deux homonymes
 * plausibles — dans un import, deviner à la place de l'organisateur ferait
 * jouer quelqu'un sous le nom d'un autre.
 */
export async function rapprocherParticipants(
  entrees: EntreeImport[],
): Promise<Resultat<LigneImport[]>> {
  const { supabase, ca } = await contexteCA();
  if (!ca) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (entrees.length === 0) return { ok: false, error: 'Aucun nom à rapprocher.' };
  if (entrees.length > 200) return { ok: false, error: 'Liste trop longue (200 participants au maximum).' };

  const registre = await chargerRegistre(supabase);
  const nomComplet = (l: Licencie) => `${l.prenom} ${l.nom}`.trim();

  // Un licencié déjà attribué à une ligne ne peut pas l'être à une autre : sinon
  // deux lignes pointeraient la même personne et l'enregistrement échouerait.
  const pris = new Set<number>();

  const lignes: LigneImport[] = entrees.map((e) => {
    const r = rapprocherNom(e.nom, registre);
    if (r.trouve && !pris.has(r.licencie.id)) {
      pris.add(r.licencie.id);
      return {
        nomLu: e.nom,
        equipeDepart: e.equipeDepart,
        personneId: r.licencie.id,
        nomRegistre: nomComplet(r.licencie),
        statut: 'trouve',
        candidats: [],
      };
    }
    const candidats = (r.trouve ? [r.licencie] : r.candidats)
      .filter((c) => !pris.has(c.id))
      .map((c) => ({ id: c.id, nom: nomComplet(c) }));
    return {
      nomLu: e.nom,
      equipeDepart: e.equipeDepart,
      personneId: null,
      nomRegistre: null,
      statut: candidats.length > 0 ? 'ambigu' : 'inconnu',
      candidats,
    };
  });

  return { ok: true, donnees: lignes };
}

/* ------------------------------------------------------------------- IA */

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
        joueurs: z.array(z.string()).describe('Noms des joueurs, tels qu\'écrits.'),
      }),
    )
    .describe(
      "Une entrée par équipe. Si le document est une simple liste de joueurs sans équipes, renvoyer une seule entrée avec numero null contenant tous les joueurs.",
    ),
});

const INSTRUCTIONS = `Tu lis la liste des participants d'un concours de pétanque, photographiée ou scannée.

Recopie les noms EXACTEMENT tels qu'ils sont écrits : ne corrige pas l'orthographe, n'inverse pas prénom et nom, n'ajoute personne, n'invente rien.
Si une équipe est incomplète, renvoie seulement les joueurs présents.
Ignore les titres ("LES ÉQUIPES"), les numéros de page et tout ce qui n'est pas un nom de joueur.
Si une partie du document est manuscrite et que tu hésites sur un nom, recopie ta meilleure lecture — un humain relira tout derrière toi.`;

const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
const TAILLE_MAX = 8 * 1024 * 1024;

/**
 * Lit une photo ou un PDF de liste d'équipes. Le résultat est une PROPOSITION :
 * il passe systématiquement par l'écran de correction avant d'être enregistré.
 * Sur du manuscrit, la lecture est approximative — c'est assumé et annoncé.
 */
export async function analyserFichierParticipants(
  base64: string,
  mediaType: string,
): Promise<Resultat<{ entrees: EntreeImport[]; aDesEquipes: boolean }>> {
  const { ca } = await contexteCA();
  if (!ca) return { ok: false, error: 'Action réservée aux membres du CA.' };

  if (!TYPES_ACCEPTES.includes(mediaType)) {
    return { ok: false, error: 'Format non pris en charge : envoyez une photo (JPEG, PNG, WEBP) ou un PDF.' };
  }
  // base64 pèse ~4/3 de l'original
  if (base64.length * 0.75 > TAILLE_MAX) {
    return { ok: false, error: 'Fichier trop lourd (8 Mo au maximum).' };
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { ok: false, error: "La lecture par IA n'est pas configurée sur cet environnement." };
  }

  let objet: z.infer<typeof SCHEMA>;
  try {
    // L'API peut rester muette un long moment en cas de surcharge (503) plutôt
    // que d'échouer vite : sans plafond, l'écran resterait bloqué sur
    // « Lecture en cours… » indéfiniment. 25 s laisse le temps d'une photo
    // normale tout en donnant, sinon, un message exploitable.
    const { object } = await generateObject({
      model: google('gemini-flash-latest'),
      schema: SCHEMA,
      abortSignal: AbortSignal.timeout(25_000),
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
    objet = object;
  } catch (e) {
    // AbortSignal.timeout() lève un TimeoutError ; un abandon manuel donnerait
    // AbortError — les deux traduisent la même chose côté organisateur.
    const delai = e instanceof Error && /^(Timeout|Abort)Error$/.test(e.name);
    return {
      ok: false,
      error: delai
        ? "Le service de lecture par IA met trop de temps à répondre (souvent une surcharge passagère). Réessayez dans une minute, ou utilisez l'import Excel/CSV."
        : e instanceof Error
          ? `Lecture impossible : ${e.message}`
          : 'Lecture impossible.',
    };
  }

  // On repasse par l'analyseur de texte : il applique le même nettoyage
  // (numéros collés, cellules parasites) que l'import de fichier, donc les deux
  // chemins produisent exactement la même chose.
  const texte = objet.equipes
    .map((eq) => {
      const prefixe = objet.aDesEquipes && eq.numero != null ? `${eq.numero}) ` : '';
      return prefixe + eq.joueurs.join(', ');
    })
    .join('\n');

  const lecture = analyserTexte(texte);
  const entrees = objet.aDesEquipes
    ? lecture.entrees
    : lecture.entrees.map((e) => ({ ...e, equipeDepart: null }));

  if (entrees.length === 0) {
    return { ok: false, error: "Aucun nom lisible n'a été trouvé sur ce document." };
  }
  return { ok: true, donnees: { entrees, aDesEquipes: objet.aDesEquipes } };
}
