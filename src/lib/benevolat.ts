import { createClient } from './supabase/server';

export type ParticipationBenevole = {
  affectationId: number;
  manifestationId: number;
  manifestationNom: string;
  tache: string;
  categorie: string;
  date: string;
  heureDebut: string | null;
  heureFin: string | null;
};

export type TableauDeBordBenevole = {
  nom: string;
  total: number;
  totalPassees: number;
  totalAVenir: number;
  heuresTotal: number;
  parCategorie: { categorie: string; nombre: number }[];
  parAnnee: { annee: string; nombre: number }[];
  passees: ParticipationBenevole[];
  aVenir: ParticipationBenevole[];
};

function dureeHeures(heureDebut: string | null, heureFin: string | null): number {
  if (!heureDebut || !heureFin) return 0;
  const [hD, mD] = heureDebut.split(':').map(Number);
  const [hF, mF] = heureFin.split(':').map(Number);
  const minutes = hF * 60 + mF - (hD * 60 + mD);
  return minutes > 0 ? minutes / 60 : 0;
}

/** Relie la session auth (email) à un nom canonique via `personnes`, puis
 *  retrouve les affectations enregistrées sous ce nom — même schéma que
 *  nomCanoniqueEtEstMembre() dans actions/manifestations.ts, mais dans le
 *  sens email → nom plutôt que nom saisi → nom canonique. Pense-bête
 *  Jérôme, 26/07/2026 : "les données que je vois sont celles qui
 *  correspondent à mon login" — jamais de nom passé en paramètre. */
export async function getMonTableauDeBordBenevole(): Promise<TableauDeBordBenevole | null> {
  const supabase = await createClient();

  /** RPC security definer (migration 0020) : un licencié non-CA ne peut
   *  pas lire `personnes` (RLS "lecture CA uniquement"), donc la
   *  résolution email → nom canonique doit passer par une fonction serveur
   *  plutôt qu'une requête directe sur `personnes` depuis ce client. */
  const { data: nom, error: errNom } = await supabase.rpc('mon_nom_benevole');
  if (errNom || !nom) return null;

  const { data: affectations, error } = await supabase
    .from('affectations')
    .select(
      'id, nom, creneaux!inner(id, tache, categorie, date, heure_debut, heure_fin, manifestation_id, manifestations!inner(nom))'
    )
    .ilike('nom', nom)
    .eq('supprime', false);
  if (error) throw error;

  const aujourdHui = new Date().toISOString().slice(0, 10);

  const participations: ParticipationBenevole[] = (affectations ?? []).map((a) => {
    const creneau = Array.isArray(a.creneaux) ? a.creneaux[0] : a.creneaux;
    const manifestation = Array.isArray(creneau.manifestations) ? creneau.manifestations[0] : creneau.manifestations;
    return {
      affectationId: a.id,
      manifestationId: creneau.manifestation_id,
      manifestationNom: manifestation?.nom ?? '',
      tache: creneau.tache,
      categorie: creneau.categorie,
      date: creneau.date,
      heureDebut: creneau.heure_debut,
      heureFin: creneau.heure_fin,
    };
  });

  const passees = participations.filter((p) => p.date < aujourdHui).sort((a, b) => b.date.localeCompare(a.date));
  const aVenir = participations.filter((p) => p.date >= aujourdHui).sort((a, b) => a.date.localeCompare(b.date));

  const parCategorieMap = new Map<string, number>();
  const parAnneeMap = new Map<string, number>();
  let heuresTotal = 0;
  participations.forEach((p) => {
    parCategorieMap.set(p.categorie, (parCategorieMap.get(p.categorie) ?? 0) + 1);
    const annee = p.date.slice(0, 4);
    parAnneeMap.set(annee, (parAnneeMap.get(annee) ?? 0) + 1);
    heuresTotal += dureeHeures(p.heureDebut, p.heureFin);
  });

  return {
    nom,
    total: participations.length,
    totalPassees: passees.length,
    totalAVenir: aVenir.length,
    heuresTotal: Math.round(heuresTotal * 10) / 10,
    parCategorie: Array.from(parCategorieMap.entries())
      .map(([categorie, nombre]) => ({ categorie, nombre }))
      .sort((a, b) => b.nombre - a.nombre),
    parAnnee: Array.from(parAnneeMap.entries())
      .map(([annee, nombre]) => ({ annee, nombre }))
      .sort((a, b) => a.annee.localeCompare(b.annee)),
    passees,
    aVenir,
  };
}
