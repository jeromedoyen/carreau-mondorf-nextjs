import { createClient } from './supabase/server';
import type { RencontreD2 } from './data';

export type PartieExistante = {
  phase: number;
  type: string;
  ordre: number;
  joueursCM: string;
  joueursAdverse: string;
  scoreCM: number | null;
  scoreAdverse: number | null;
  terrain: string | null;
};

export type RencontreDetail = RencontreD2 & { parties: PartieExistante[] };

/** Dans un fichier séparé de data.ts (pas juste une fonction dedans) : cette
 *  fonction utilise le client Supabase avec session (next/headers via
 *  supabase/server.ts), server-only. Si elle vivait dans data.ts, tout
 *  composant client qui importe data.ts pour une fonction publique
 *  (getEquipesPromotion, etc. — cf. PromotionContent.tsx) casserait le
 *  build (next/headers ne peut pas atterrir dans un bundle client).
 *
 *  Rencontre + détail des parties déjà saisies (pour préremplir le
 *  formulaire de saisie/modification). Utilise le client avec session :
 *  `parties_d2` est réservée au CA depuis 0006_verrouillage_stats.sql — un
 *  client anonyme recevrait un tableau de parties vide, cassant le
 *  préremplissage pour le CA lui-même. Uniquement appelée depuis la page de
 *  saisie (déjà dynamique/gardée CA), donc aucun impact sur le rendu
 *  statique des pages publiques. */
export async function getRencontreDetail(id: number): Promise<RencontreDetail | null> {
  const supabase = await createClient();

  const { data: rencontre, error: errR } = await supabase
    .from('rencontres_d2')
    .select('id, journee, date, domicile, club_adverse, score_cm, score_adverse, statut')
    .eq('id', id)
    .maybeSingle();
  if (errR) throw errR;
  if (!rencontre) return null;

  const { data: parties, error: errP } = await supabase
    .from('parties_d2')
    .select('phase, type, ordre, joueurs_cm, joueurs_adverse, score_cm, score_adverse, terrain')
    .eq('rencontre_id', id)
    .eq('supprime', false)
    .order('phase', { ascending: true })
    .order('ordre', { ascending: true });
  if (errP) throw errP;

  return {
    id: rencontre.id as number,
    journee: rencontre.journee as number,
    date: rencontre.date as string,
    domicile: rencontre.domicile as boolean | null,
    adversaire: rencontre.club_adverse as string | null,
    scoreCM: rencontre.score_cm as number | null,
    scoreAdverse: rencontre.score_adverse as number | null,
    statut: rencontre.statut as string,
    parties: (parties ?? []).map((p) => ({
      phase: p.phase as number,
      type: p.type as string,
      ordre: p.ordre as number,
      joueursCM: p.joueurs_cm as string,
      joueursAdverse: p.joueurs_adverse as string,
      scoreCM: p.score_cm as number | null,
      scoreAdverse: p.score_adverse as number | null,
      terrain: p.terrain as string | null,
    })),
  };
}
