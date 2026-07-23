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
