'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type PartieSaisie = {
  phase: number;
  type: 'Tête à tête' | 'Doublette' | 'Triplette';
  ordre: number;
  joueursCM: string;
  joueursAdverse: string;
  scoreCM: number;
  scoreAdverse: number;
  terrain?: string;
};

export type ResultatEnregistrement =
  | { ok: true; scoreCM: number; scoreAdverse: number; resultat: string }
  | { ok: false; error: string };

/** Points attribués à une victoire de partie — port fidèle de
 *  pointsVictoirePartie_() (ChampionnatBackend.gs:54). */
function pointsVictoirePartie(phase: number, type: string): number {
  if (type === 'Triplette') return 5;
  if (type === 'Doublette') return 3;
  if (type === 'Tête à tête') return phase === 3 ? 3 : 2;
  throw new Error(`Type de partie inconnu pour le calcul des points : "${type}"`);
}

/** Port fidèle de enregistrerResultatRencontre_() (ChampionnatBackend.gs:616) :
 *  suppression douce des parties existantes de la rencontre (jamais de
 *  hard-delete), insertion des nouvelles, recalcul du score et du résultat.
 *  Simplification assumée par rapport à l'original : pas de rapprochement
 *  automatique des noms (canoniserJoueursCM_/rapprocherNomJoueur_, système
 *  de correspondance flou non porté ici) — "Joueurs CM" est enregistré tel
 *  que saisi par le CA. Le contrôle d'accès CA est fait explicitement ici
 *  ET implicitement par la RLS (0005_ecriture_ca.sql) — double sécurité. */
export async function enregistrerResultatRencontre(
  rencontreId: number,
  parties: PartieSaisie[]
): Promise<ResultatEnregistrement> {
  const supabase = await createClient();

  const { data: estCA } = await supabase.rpc('est_membre_ca');
  if (!estCA) {
    return { ok: false, error: 'Action réservée aux membres du CA.' };
  }

  const { error: errSoftDelete } = await supabase
    .from('parties_d2')
    .update({ supprime: true })
    .eq('rencontre_id', rencontreId)
    .eq('supprime', false);
  if (errSoftDelete) return { ok: false, error: errSoftDelete.message };

  let scoreCM = 0;
  let scoreAdverse = 0;
  const lignes = parties.map((p) => {
    const points = pointsVictoirePartie(p.phase, p.type);
    if (p.scoreCM > p.scoreAdverse) scoreCM += points;
    else if (p.scoreAdverse > p.scoreCM) scoreAdverse += points;
    return {
      rencontre_id: rencontreId,
      phase: p.phase,
      type: p.type,
      ordre: p.ordre,
      joueurs_cm: p.joueursCM,
      joueurs_adverse: p.joueursAdverse,
      score_cm: p.scoreCM,
      score_adverse: p.scoreAdverse,
      terrain: p.terrain || null,
      supprime: false,
    };
  });

  if (lignes.length) {
    const { error: errInsert } = await supabase.from('parties_d2').insert(lignes);
    if (errInsert) return { ok: false, error: errInsert.message };
  }

  const resultat = scoreCM > scoreAdverse ? 'Victoire' : scoreAdverse > scoreCM ? 'Défaite' : 'Nul';
  const { error: errUpdate } = await supabase
    .from('rencontres_d2')
    .update({ statut: 'Jouée', score_cm: scoreCM, score_adverse: scoreAdverse, resultat })
    .eq('id', rencontreId);
  if (errUpdate) return { ok: false, error: errUpdate.message };

  revalidatePath('/national-d2');
  return { ok: true, scoreCM, scoreAdverse, resultat };
}

const SCHEMA_PARTIE = z.object({
  phase: z.number(),
  type: z.enum(['Tête à tête', 'Doublette', 'Triplette']),
  ordre: z.number(),
  joueursCM: z.string(),
  joueursAdverse: z.string(),
  scoreCM: z.number(),
  scoreAdverse: z.number(),
  terrain: z.string().optional(),
});

export type ResultatExtractionPdf =
  | { ok: true; lignes: PartieSaisie[] }
  | { ok: false; error: string };

/** Extraction du détail d'une feuille de match à partir d'un PDF fourni par
 *  le CA (28/07/2026, demande Jérôme, enregistrement audio) — pour éviter
 *  de ressaisir à la main les 20 lignes quand le fichier de résultats
 *  officiel existe déjà. Réutilise le modèle Gemini déjà en place pour
 *  Caro (lecture native de PDF, pas de bibliothèque d'extraction de texte
 *  à ajouter) ; ne fait qu'extraire, jamais enregistrer directement — le
 *  résultat préremplit la feuille de match ci-dessous, à relire et
 *  corriger par le CA avant "Enregistrer le résultat". */
export async function extraireResultatsPdf(
  pdfBase64: string,
  contexte: { domicile: boolean; adversaire: string }
): Promise<ResultatExtractionPdf> {
  const supabase = await createClient();
  const { data: estCA } = await supabase.rpc('est_membre_ca');
  if (!estCA) return { ok: false, error: 'Action réservée aux membres du CA.' };

  try {
    const { object } = await generateObject({
      model: google('gemini-flash-latest'),
      schema: z.object({ parties: z.array(SCHEMA_PARTIE) }),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Voici la feuille de match d'une rencontre de pétanque National Division 2 (fédération FLBP), au format PDF. Extrais le détail des 20 parties.

Structure attendue :
- Phase 1 : 9 parties de type "Tête à tête"
- Phase 2 : 3 parties de type "Triplette"
- Phase 3 : 4 parties de type "Doublette" puis 1 partie de type "Tête à tête"
- Phase 4 : 3 parties de type "Triplette"

Pour chaque partie, donne phase, type, ordre (position dans sa phase, à partir de 1), les joueurs (séparés par des virgules pour les doublettes/triplettes), les deux scores et le numéro de terrain si indiqué.

Le club "Carreau Mondorf" joue ${contexte.domicile ? 'à domicile' : 'à l\'extérieur'} contre "${contexte.adversaire}". "joueursCM" doit toujours contenir les joueurs de Carreau Mondorf et "scoreCM" son score, quelle que soit la colonne dans laquelle ils apparaissent sur le PDF.`,
            },
            { type: 'file', data: pdfBase64, mediaType: 'application/pdf' },
          ],
        },
      ],
    });

    return { ok: true, lignes: object.parties };
  } catch (e) {
    return { ok: false, error: `Échec de l'extraction : ${(e as Error).message}` };
  }
}

export type ResultatForfait = { ok: true } | { ok: false; error: string };

/** Port fidèle de declarerForfaitRencontre() (ChampionnatBackend.gs:1193) :
 *  le club vainqueur d'un forfait remporte 32-0 (règlement FLBP). Ne touche
 *  jamais parties_d2 (même comportement que l'original — si une feuille de
 *  match avait déjà été saisie puis corrigée en forfait, les anciennes
 *  parties restent en base, gap connu déjà présent côté v1, pas corrigé
 *  ici pour rester fidèle). */
export async function declarerForfaitRencontre(
  rencontreId: number,
  forfaitDe: 'CM' | 'Adverse'
): Promise<ResultatForfait> {
  const supabase = await createClient();

  const { data: estCA } = await supabase.rpc('est_membre_ca');
  if (!estCA) {
    return { ok: false, error: 'Action réservée aux membres du CA.' };
  }

  const scoreCM = forfaitDe === 'CM' ? 0 : 32;
  const scoreAdverse = forfaitDe === 'CM' ? 32 : 0;
  const statut = forfaitDe === 'CM' ? 'ForfaitCM' : 'ForfaitAdverse';
  const resultat = forfaitDe === 'CM' ? 'Défaite' : 'Victoire';

  const { error } = await supabase
    .from('rencontres_d2')
    .update({ statut, score_cm: scoreCM, score_adverse: scoreAdverse, resultat })
    .eq('id', rencontreId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/national-d2');
  return { ok: true };
}
