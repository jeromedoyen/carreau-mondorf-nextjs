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

const SchemaStrategie = z.object({
  phase2Triplettes: z
    .array(z.array(z.string()).length(3))
    .length(3)
    .describe('Phase 2 : 3 triplettes de 3 joueurs, couvrant les 9 joueurs exactement une fois.'),
  phase3Doublettes: z
    .array(z.array(z.string()).length(2))
    .length(4)
    .describe('Phase 3 : 4 doublettes de 2 joueurs.'),
  phase3TeteATeteSolo: z
    .string()
    .describe('Phase 3 : le 9e joueur, qui joue seul en tête à tête (jamais une joueuse, cf. contrainte).'),
  phase4Triplettes: z
    .array(z.array(z.string()).length(3))
    .length(3)
    .describe('Phase 4 : 3 triplettes de 3 joueurs, couvrant les 9 joueurs exactement une fois — peut différer de la phase 2.'),
  probabiliteVictoireRencontre: z
    .number()
    .min(0)
    .max(100)
    .describe('Estimation, en pourcentage, de la probabilité de gagner la rencontre avec cette composition.'),
  justification: z
    .string()
    .describe(
      'Analyse de technicien/statisticien (4-6 phrases) : quels joueurs sont en forme ou en perte de vitesse (évolution récente, pas juste la moyenne saison), quels binômes/trios ont fait leurs preuves, pourquoi cette répartition précise maximise la probabilité de victoire pour CETTE stratégie.'
    ),
});
export type StrategieComposition = z.infer<typeof SchemaStrategie>;

const SchemaComposition = z.object({
  agressive: SchemaStrategie.describe(
    'Stratégie agressive : maximiser la probabilité de gagner CHAQUE groupe (triplettes, doublettes, tête à tête), pas seulement la rencontre dans son ensemble.'
  ),
  defensive: SchemaStrategie.describe(
    "Stratégie défensive : concentrer les 3 meilleurs joueurs disponibles (au vu des stats triplette) dans UNE seule triplette parmi les 6 possibles (3 en phase 2 + 3 en phase 4) pour la rendre quasi-certaine de gagner, quitte à affaiblir les deux autres triplettes de cette phase. Les doublettes et le tête à tête restent optimisés normalement."
  ),
});
export type CompositionEquipe = z.infer<typeof SchemaComposition>;

type Resultat =
  | { ok: true; composition: CompositionEquipe }
  | { ok: false; error: string };

function couvre9UneFois(groupes: string[][], neuf: string[]): boolean {
  const vus = groupes.flat();
  return vus.length === 9 && new Set(vus).size === 9 && vus.every((n) => neuf.includes(n));
}

function validerStrategie(s: StrategieComposition, neuf: string[], feminines: Set<string>): boolean {
  const couverture =
    couvre9UneFois(s.phase2Triplettes, neuf) &&
    couvre9UneFois(s.phase4Triplettes, neuf) &&
    couvre9UneFois([...s.phase3Doublettes, [s.phase3TeteATeteSolo]], neuf);
  if (!couverture) return false;
  if (feminines.has(s.phase3TeteATeteSolo)) return false;
  return true;
}

/** Propose deux compositions d'équipe (agressive / défensive) pour une
 *  rencontre National D2 (règlement FLBP : phase 1 = 9 tête à tête
 *  individuels, phase 2 = 3 triplettes, phase 3 = 4 doublettes + 1 tête à
 *  tête, phase 4 = 3 triplettes — cf. GABARIT_PHASES dans
 *  FeuilleDeMatch.tsx). Demande de Jérôme (01/08/2026, affinée après un
 *  premier essai) :
 *  - deux stratégies distinctes plutôt qu'une seule composition (voir
 *    SchemaComposition) avec une estimation chiffrée de la probabilité de
 *    victoire de la rencontre pour chacune ;
 *  - contrainte dure : une joueuse ne doit jamais être assignée au tête à
 *    tête solo de la phase 3 (retour direct de Jérôme après le premier
 *    essai) — validée ici, pas seulement demandée dans le prompt ;
 *  - pas de recherche d'équité de temps de jeu entre joueurs (chacun joue
 *    de toute façon une partie à chaque phase quel que soit le groupe —
 *    seule la probabilité de victoire de chaque groupe compte) ;
 *  - analyse de forme/tendance dans le temps, pas seulement la moyenne
 *    saison : on passe l'historique chronologique complet (le plus récent
 *    en premier, stats.ts trie déjà `parties` par date décroissante) plutôt
 *    que juste un taux agrégé, pour que l'IA puisse repérer un joueur en
 *    forme ou en perte de vitesse.
 *  Même modèle que l'assistant Caro (Gemini Flash, palier gratuit) — un
 *  seul appel structuré (generateObject), pas de conversation. Résultat non
 *  enregistré en base : aide à la décision, la saisie réelle de la feuille
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
  const feminines = new Set(joueursSelectionnes.filter((n) => sexeParNom.get(n) === 'F'));
  if (!feminines.size) {
    return { ok: false, error: 'La sélection doit inclure au moins une féminine.' };
  }

  const ensembleSelectionnes = new Set(joueursSelectionnes);
  const statsIndividuelles = joueursSelectionnes.map((nom) => {
    const j = stats.joueurs.find((s) => s.nom === nom);
    if (!j) return { nom, statistiquesDisponibles: false as const };
    return {
      nom,
      statistiquesDisponibles: true as const,
      tauxVictoireGlobalSaison: Math.round(j.tauxVictoire * 100),
      parType: Object.fromEntries(
        Object.entries(j.parType).map(([type, t]) => [
          type,
          `${t.victoires}/${t.joues} (${t.joues ? Math.round((t.victoires / t.joues) * 100) : 0}%)`,
        ])
      ),
      historiqueChronologique_duPlusRecentAuPlusAncien: j.parties.map((p) => ({
        journee: p.journee,
        type: p.type,
        resultat: p.gagne ? 'victoire' : 'défaite',
        pointsMarques: p.points,
      })),
    };
  });
  const binomesConnus = stats.equipes
    .filter((e) => e.joueurs.every((n) => ensembleSelectionnes.has(n)))
    .map((e) => ({
      joueurs: e.joueurs,
      type: e.type,
      resultat: `${e.victoires}/${e.joues} victoires (${Math.round(e.tauxVictoire * 100)}%)`,
    }));

  const prompt = `Tu es à la fois un technicien de pétanque confirmé (tu connais les rapports de force triplette/doublette/tête à tête) et un statisticien sportif rigoureux (tu analyses les tendances de forme, pas seulement une moyenne brute). Ta mission : composer la meilleure équipe possible pour une rencontre de championnat National D2 (Carreau Boules et Pétanque Mondorf), saison ${saison}, à partir des 9 joueurs déjà sélectionnés ci-dessous — tu ne dois RIEN changer à cette liste de 9, seulement décider qui joue où.

JOUEURS SÉLECTIONNÉS (9, dont au moins une féminine — voir contrainte plus bas) :
${joueursSelectionnes.map((n) => `- ${n}${feminines.has(n) ? ' (féminine)' : ''}`).join('\n')}

FORMAT D'UNE RENCONTRE (règlement FLBP, fixe, à respecter strictement) :
- Phase 1 : 9 tête à tête individuels, chaque joueur joue seul une fois (rien à composer, ignore cette phase).
- Phase 2 : 3 triplettes de 3 joueurs — couvrent les 9 joueurs exactement une fois.
- Phase 3 : 4 doublettes de 2 joueurs (8 joueurs) + 1 joueur seul en tête à tête — couvrent les 9 joueurs exactement une fois.
- Phase 4 : 3 triplettes de 3 joueurs — couvrent à nouveau les 9 joueurs exactement une fois (peut différer de la phase 2).

CONTRAINTES DURES (non négociables, toute réponse qui les viole est invalide) :
1. Le tête à tête solo de la phase 3 ne doit JAMAIS être une joueuse — assigne systématiquement une des féminines à une doublette, jamais au tête à tête solo.
2. Ne cherche PAS à équilibrer artificiellement le "temps de jeu" ou la visibilité entre les 9 joueurs par souci d'équité : chaque joueur joue de toute façon exactement une partie à chaque phase quel que soit le groupe où tu le places. Seule compte la probabilité de victoire de chaque groupe — un joueur fort peut très bien se retrouver dans plusieurs groupes forts si c'est statistiquement le meilleur choix.
3. Chaque phase (2, 3, 4) doit couvrir les 9 joueurs exactement une fois chacun — vérifie ce point avant de répondre.

DONNÉES STATISTIQUES (saison ${saison}) :
Pour chaque joueur : taux de victoire global saison, détail par type de partie (victoires/parties jouées), ET l'historique chronologique complet de ses parties, trié du PLUS RÉCENT au PLUS ANCIEN — utilise cet historique pour juger la forme du moment (une série récente de victoires ou de défaites pèse plus lourd qu'une moyenne saison qui peut cacher une progression ou une baisse de régime) :
${JSON.stringify(statsIndividuelles, null, 2)}

Binômes/trios déjà joués ensemble cette saison parmi ces 9 joueurs (s'il y en a — un duo qui a déjà bien fonctionné ensemble est un signal fort, à privilégier) :
${binomesConnus.length ? JSON.stringify(binomesConnus, null, 2) : 'Aucun historique de binôme/trio disponible entre ces joueurs.'}

Pour un joueur sans statistique disponible cette saison (statistiquesDisponibles: false), utilise ton meilleur jugement d'expert sans chercher à le protéger ni le sur-exposer par équité — place-le là où le reste de la composition en a le plus besoin.

DEUX STRATÉGIES À PRODUIRE :

1. AGRESSIVE : l'objectif est de gagner le maximum de groupes possible (toutes les triplettes, toutes les doublettes, le tête à tête). Optimise chaque groupe indépendamment pour sa propre probabilité de victoire.

2. DÉFENSIVE : contexte typique d'usage — un dernier tour de saison où une seule victoire en triplette suffit (par exemple pour sécuriser un maintien ou une montée). Choisis UNE seule triplette parmi les 6 possibles (3 en phase 2 + 3 en phase 4) et concentre-y les 3 meilleurs joueurs disponibles pour cette configuration précise, pour la rendre quasiment certaine de gagner — quitte à ce que les deux autres triplettes de cette même phase soient nettement plus faibles en conséquence. Les 4 doublettes et le tête à tête de la phase 3 restent optimisés normalement (comme en stratégie agressive), seule la répartition des triplettes change de logique.

Pour chacune des deux stratégies, donne une estimation chiffrée (0-100) de la probabilité de gagner la rencontre dans son ensemble avec cette composition, et une justification de technicien/statisticien précise (joueurs en forme/en perte de vitesse identifiés depuis l'historique, binômes qui ont fait leurs preuves, logique de la répartition).`;

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
    validerStrategie(objet.agressive, joueursSelectionnes, feminines) &&
    validerStrategie(objet.defensive, joueursSelectionnes, feminines);
  if (!valide) {
    return {
      ok: false,
      error:
        "La proposition de l'IA ne respectait pas les contraintes (couverture des 9 joueurs ou tête à tête solo féminin) — réessaie.",
    };
  }

  return { ok: true, composition: objet };
}
