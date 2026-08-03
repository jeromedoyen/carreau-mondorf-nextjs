import type { SupabaseClient } from '@supabase/supabase-js';

export type PhotoEquipeConcours = {
  chemin: string;
  url: string;
  club: string | null;
  date: string;
  joueurs: string[];
};

type Ligne = {
  photo_equipe_chemin: string;
  club: string | null;
  date: string;
  personnes: { nom: string; prenom: string } | { nom: string; prenom: string }[] | null;
};

function nomPersonne(p: Ligne['personnes']): string | null {
  const l = Array.isArray(p) ? p[0] : p;
  return l ? `${l.prenom} ${l.nom}` : null;
}

/** Photos d'équipe des déclarations vocales (03/08/2026) — une photo par
 *  déclaration, partagée par toutes les lignes de l'équipe (une ligne par
 *  joueur, cf. creerLignesParticipation). Regroupe par chemin de fichier
 *  pour n'afficher chaque photo qu'une fois, avec la liste des joueurs
 *  qu'elle représente.
 *
 *  URL signées (bucket privé, 1h) générées ici plutôt que côté client :
 *  seule la trésorerie doit pouvoir les obtenir, la policy RLS du bucket
 *  (migration 0053) restreint la lecture à la trésorerie ou au déposant. */
export async function getPhotosEquipeConcours(supabase: SupabaseClient, saison: string): Promise<PhotoEquipeConcours[]> {
  const { data, error } = await supabase
    .from('participations_concours')
    .select('photo_equipe_chemin, club, date, personnes!participations_concours_personne_id_fkey(nom, prenom)')
    .eq('saison', saison)
    .eq('supprime', false)
    .not('photo_equipe_chemin', 'is', null)
    .order('date', { ascending: false });
  if (error) throw error;

  const parChemin = new Map<string, { club: string | null; date: string; joueurs: string[] }>();
  for (const ligne of (data ?? []) as unknown as Ligne[]) {
    const chemin = ligne.photo_equipe_chemin;
    const existant = parChemin.get(chemin);
    const nom = nomPersonne(ligne.personnes);
    if (existant) {
      if (nom) existant.joueurs.push(nom);
    } else {
      parChemin.set(chemin, { club: ligne.club, date: ligne.date, joueurs: nom ? [nom] : [] });
    }
  }

  const photos = await Promise.all(
    Array.from(parChemin.entries()).map(async ([chemin, info]) => {
      const { data: signee } = await supabase.storage.from('photos-concours').createSignedUrl(chemin, 3600);
      return { chemin, url: signee?.signedUrl ?? '', club: info.club, date: info.date, joueurs: info.joueurs };
    })
  );

  return photos.filter((p) => p.url);
}
