import { createClient } from './supabase/server';

export type Manifestation = {
  id: number;
  saison: string;
  nom: string;
  dateDebut: string;
  dateFin: string;
  lieu: string | null;
  type: string | null;
  statut: string;
  notes: string | null;
};

export type Creneau = {
  id: number;
  tache: string;
  categorie: string;
  date: string;
  heureDebut: string | null;
  heureFin: string | null;
  finImprecise: boolean;
  postesPrevus: number;
  notes: string | null;
  affectations: { id: number; nom: string; statut: string; estMembre: boolean }[];
};

/** Passe par le client Supabase avec session (server.ts), pas le client
 *  public de data.ts : la RLS ("lecture licenciés", cf. 0009_manifestations.sql)
 *  ne renvoie des lignes que pour un utilisateur authentifié connu de la
 *  table `acces` — même périmètre que requireSession_() côté v1
 *  (n'importe quel licencié autorisé, pas seulement le CA). */
export async function estUtilisateurAutorise(): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('est_utilisateur_autorise');
  if (error) return false;
  return !!data;
}

export async function getManifestations(saison: string): Promise<Manifestation[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('manifestations')
    .select('id, saison, nom, date_debut, date_fin, lieu, type, statut, notes')
    .eq('saison', saison)
    .eq('supprime', false)
    .order('date_debut', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((m) => ({
    id: m.id,
    saison: m.saison,
    nom: m.nom,
    dateDebut: m.date_debut,
    dateFin: m.date_fin,
    lieu: m.lieu,
    type: m.type,
    statut: m.statut,
    notes: m.notes,
  }));
}

export async function getManifestationDetail(
  id: number
): Promise<{ manifestation: Manifestation; creneaux: Creneau[] } | null> {
  const supabase = await createClient();

  const { data: m, error: errM } = await supabase
    .from('manifestations')
    .select('id, saison, nom, date_debut, date_fin, lieu, type, statut, notes')
    .eq('id', id)
    .eq('supprime', false)
    .maybeSingle();
  if (errM) throw errM;
  if (!m) return null;

  const { data: creneauxData, error: errC } = await supabase
    .from('creneaux')
    .select('id, tache, categorie, date, heure_debut, heure_fin, fin_imprecise, postes_prevus, notes')
    .eq('manifestation_id', id)
    .eq('supprime', false)
    .order('date', { ascending: true });
  if (errC) throw errC;

  const idsCreneaux = (creneauxData ?? []).map((c) => c.id);
  const { data: affectationsData, error: errA } = idsCreneaux.length
    ? await supabase
        .from('affectations')
        .select('id, creneau_id, nom, statut, est_membre')
        .in('creneau_id', idsCreneaux)
        .eq('supprime', false)
    : { data: [], error: null };
  if (errA) throw errA;

  const affectationsParCreneau = new Map<number, Creneau['affectations']>();
  (affectationsData ?? []).forEach((a) => {
    const liste = affectationsParCreneau.get(a.creneau_id) ?? [];
    liste.push({ id: a.id, nom: a.nom, statut: a.statut, estMembre: a.est_membre });
    affectationsParCreneau.set(a.creneau_id, liste);
  });

  return {
    manifestation: {
      id: m.id,
      saison: m.saison,
      nom: m.nom,
      dateDebut: m.date_debut,
      dateFin: m.date_fin,
      lieu: m.lieu,
      type: m.type,
      statut: m.statut,
      notes: m.notes,
    },
    creneaux: (creneauxData ?? []).map((c) => ({
      id: c.id,
      tache: c.tache,
      categorie: c.categorie,
      date: c.date,
      heureDebut: c.heure_debut,
      heureFin: c.heure_fin,
      finImprecise: c.fin_imprecise,
      postesPrevus: c.postes_prevus,
      notes: c.notes,
      affectations: affectationsParCreneau.get(c.id) ?? [],
    })),
  };
}
