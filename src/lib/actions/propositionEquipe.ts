'use server';

import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getStatistiquesJoueursD2 } from '@/lib/stats';

export type JoueurSelectionnable = { nom: string; sexe: string | null; aJoueCetteSaison: boolean };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

/** Licenciés de la saison (nom canonique "Prénom Nom" + sexe), avec un
 *  indicateur "a déjà joué" pour mettre en avant ceux ayant des statistiques
 *  détaillées cette saison — présentés en premier côté UI, mais la
 *  sélection reste libre (un licencié jamais aligné doit rester
 *  sélectionnable). Réservé au CA : `personnes` est CA-only (RLS). */
export async function getJoueursSelectionnables(saison: string): Promise<JoueurSelectionnable[]> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return [];

  const [{ data: personnesData }, stats] = await Promise.all([
    supabase
      .from('personnes')
      .select('nom, prenom, sexe, adhesions!inner(annee, type, supprime)')
      .eq('supprime', false)
      .eq('adhesions.annee', saison)
      .eq('adhesions.type', 'Licencié')
      .eq('adhesions.supprime', false),
    getStatistiquesJoueursD2(supabase, saison),
  ]);

  const nomsAvecStats = new Set(stats.joueurs.map((j) => j.nom));
  return ((personnesData ?? []) as { nom: string; prenom: string; sexe: string | null }[])
    .map((p) => {
      const nom = `${p.prenom} ${p.nom}`;
      return { nom, sexe: p.sexe, aJoueCetteSaison: nomsAvecStats.has(nom) };
    })
    .sort((a, b) => Number(b.aJoueCetteSaison) - Number(a.aJoueCetteSaison) || a.nom.localeCompare(b.nom));
}

const SchemaComposition = z.object({
  phase2Triplettes: z
    .array(z.array(z.string()).length(3))
    .length(3)
    .describe('Phase 2 : 3 triplettes de 3 joueurs, couvrant les 9 joueurs exactement une fois.'),
  phase3Doublettes: z
    .array(z.array(z.string()).length(2))
    .length(4)
    .describe('Phase 3 : 4 doublettes de 2 joueurs.'),
  phase3TeteATeteSolo: z.string().describe('Phase 3 : le 9e joueur, qui joue seul en tête à tête.'),
  phase4Triplettes: z
    .array(z.array(z.string()).length(3))
    .length(3)
    .describe('Phase 4 : 3 triplettes de 3 joueurs, couvrant les 9 joueurs exactement une fois — peut différer de la phase 2.'),
  justification: z
    .string()
    .describe('Explication courte (3-5 phrases) des choix, en français, appuyée sur les statistiques fournies.'),
});

export type CompositionEquipe = z.infer<typeof SchemaComposition>;

type Resultat =
  | { ok: true; composition: CompositionEquipe }
  | { ok: false; error: string };

function couvre9UneFois(groupes: string[][], neuf: string[]): boolean {
  const vus = groupes.flat();
  return vus.length === 9 && new Set(vus).size === 9 && vus.every((n) => neuf.includes(n));
}

/** Propose une composition d'équipe pour une rencontre National D2 (règlement
 *  FLBP : phase 1 = 9 tête à tête individuels donc pas de "composition" à
 *  proprement parler, phase 2 = 3 triplettes, phase 3 = 4 doublettes + 1
 *  tête à tête, phase 4 = 3 triplettes — cf. GABARIT_PHASES dans
 *  FeuilleDeMatch.tsx). Demande explicite de Jérôme (01/08/2026) : à partir
 *  d'une présélection de 9 joueurs (au moins une féminine, imposé côté UI),
 *  demander à l'IA la meilleure répartition au vu des statistiques
 *  individuelles (taux de victoire par type de partie) et des binômes/trios
 *  déjà joués ensemble cette saison (stats.equipes). Même modèle que
 *  l'assistant Caro (Gemini Flash, palier gratuit) — un seul appel
 *  structuré (generateObject), pas de conversation. Résultat non enregistré
 *  en base : c'est une aide à la décision, la saisie réelle de la feuille
 *  de match reste un geste CA distinct et volontaire. */
export async function proposerCompositionEquipe(
  saison: string,
  joueursSelectionnes: string[]
): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (joueursSelectionnes.length !== 9) {
    return { ok: false, error: 'Il faut sélectionner exactement 9 joueurs.' };
  }

  const [stats, { data: personnesData }] = await Promise.all([
    getStatistiquesJoueursD2(supabase, saison),
    supabase.from('personnes').select('nom, prenom, sexe').eq('supprime', false),
  ]);

  const sexeParNom = new Map(
    ((personnesData ?? []) as { nom: string; prenom: string; sexe: string | null }[]).map((p) => [
      `${p.prenom} ${p.nom}`,
      p.sexe,
    ])
  );
  if (!joueursSelectionnes.some((n) => sexeParNom.get(n) === 'F')) {
    return { ok: false, error: 'La sélection doit inclure au moins une féminine.' };
  }

  const ensembleSelectionnes = new Set(joueursSelectionnes);
  const statsIndividuelles = joueursSelectionnes.map((nom) => {
    const j = stats.joueurs.find((s) => s.nom === nom);
    if (!j) return { nom, statistiquesDisponibles: false as const };
    return {
      nom,
      statistiquesDisponibles: true as const,
      tauxVictoireGlobal: Math.round(j.tauxVictoire * 100),
      parType: Object.fromEntries(
        Object.entries(j.parType).map(([type, t]) => [
          type,
          `${t.victoires}/${t.joues} (${t.joues ? Math.round((t.victoires / t.joues) * 100) : 0}%)`,
        ])
      ),
    };
  });
  const binomesConnus = stats.equipes
    .filter((e) => e.joueurs.every((n) => ensembleSelectionnes.has(n)))
    .map((e) => ({
      joueurs: e.joueurs,
      type: e.type,
      resultat: `${e.victoires}/${e.joues} victoires (${Math.round(e.tauxVictoire * 100)}%)`,
    }));

  const prompt = `Voici les 9 joueurs sélectionnés pour une rencontre de championnat National D2 de pétanque (Carreau Boules et Pétanque Mondorf), saison ${saison} :
${joueursSelectionnes.map((n) => `- ${n}`).join('\n')}

Format d'une rencontre (règlement FLBP, fixe, à respecter strictement) :
- Phase 1 : 9 tête à tête individuels (chaque joueur joue seul une fois — pas de composition à proposer pour cette phase).
- Phase 2 : 3 triplettes de 3 joueurs, qui couvrent les 9 joueurs exactement une fois chacun.
- Phase 3 : 4 doublettes de 2 joueurs (8 joueurs) + 1 joueur qui rejoue en tête à tête seul — les 9 joueurs exactement une fois chacun.
- Phase 4 : 3 triplettes de 3 joueurs, qui couvrent à nouveau les 9 joueurs exactement une fois chacun (la répartition peut différer de la phase 2).

Statistiques individuelles de la saison par type de partie (victoires/parties jouées) :
${JSON.stringify(statsIndividuelles, null, 2)}

Statistiques des binômes/trios déjà joués ensemble cette saison parmi ces 9 joueurs (s'il y en a) :
${binomesConnus.length ? JSON.stringify(binomesConnus, null, 2) : 'Aucun historique de binôme/trio disponible entre ces joueurs.'}

Propose la composition qui maximise les chances de victoire globales de l'équipe, en te basant sur ces statistiques (privilégie les joueurs performants dans le type de partie où tu les places, et les binômes/trios qui ont déjà bien fonctionné ensemble quand l'historique existe). Pour les joueurs sans statistique disponible, utilise ton jugement pour les répartir équitablement entre les groupes plutôt que de les concentrer. Chaque phase doit couvrir les 9 joueurs exactement une fois — vérifie ce point avant de répondre.`;

  let objet: CompositionEquipe;
  try {
    const resultat = await generateObject({
      model: google('gemini-flash-latest'),
      schema: SchemaComposition,
      prompt,
    });
    objet = resultat.object;
  } catch {
    return { ok: false, error: "L'IA n'a pas pu générer de proposition — réessaie dans un instant." };
  }

  const valide =
    couvre9UneFois(objet.phase2Triplettes, joueursSelectionnes) &&
    couvre9UneFois(objet.phase4Triplettes, joueursSelectionnes) &&
    couvre9UneFois([...objet.phase3Doublettes, [objet.phase3TeteATeteSolo]], joueursSelectionnes);
  if (!valide) {
    return {
      ok: false,
      error: "La proposition de l'IA ne couvrait pas correctement les 9 joueurs — réessaie.",
    };
  }

  return { ok: true, composition: objet };
}
