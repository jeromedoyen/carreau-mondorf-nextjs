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

/** RPC security definer (migration 0020) : un licencié non-CA ne peut pas
 *  lire `personnes` (RLS "lecture CA uniquement"), donc la résolution
 *  email → nom canonique doit passer par une fonction serveur plutôt
 *  qu'une requête directe sur `personnes` depuis ce client. Toujours dérivé
 *  de la session courante, jamais un nom passé en paramètre (pense-bête
 *  Jérôme, 26/07/2026 : "les données que je vois sont celles qui
 *  correspondent à mon login"). */
export async function getMonNomBenevole(): Promise<string | null> {
  const supabase = await createClient();
  const { data: nom, error } = await supabase.rpc('mon_nom_benevole');
  if (error) return null;
  return nom ?? null;
}

/** Comparaison insensible aux accents/casse — même principe que
 *  normaliser() dans actions/manifestations.ts (pas exportée de là,
 *  dupliquée ici plutôt que sortie dans un fichier partagé pour une seule
 *  ligne de logique). */
export function memeNom(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const normaliser = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  return normaliser(a) === normaliser(b);
}

/** Retrouve les affectations enregistrées sous ce nom canonique. */
export async function getMonTableauDeBordBenevole(): Promise<TableauDeBordBenevole | null> {
  const supabase = await createClient();
  const nom = await getMonNomBenevole();
  if (!nom) return null;

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
