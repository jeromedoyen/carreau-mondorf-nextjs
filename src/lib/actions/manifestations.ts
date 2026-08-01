'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierAutorise(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_utilisateur_autorise');
  return !!data;
}

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

/** Nom canonique "Prénom Nom" si `nom` correspond à un membre connu dans le
 *  registre, sinon le nom saisi tel quel — port simplifié de
 *  nomCanonique_()/isNomMembreConnu_() (carreau-mondorf-app/Code.gs:1208
 *  et 1239) : même principe (comparaison insensible aux accents/casse sur
 *  prénom + initiale du nom), sans le rapprochement flou complet (pas
 *  nécessaire ici, le registre membres est une liste fermée contrairement
 *  aux noms de joueurs de compétition tapés à la main depuis des années). */
function normaliser(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

async function nomCanoniqueEtEstMembre(
  supabase: Awaited<ReturnType<typeof createClient>>,
  nomSaisi: string
): Promise<{ nom: string; estMembre: boolean }> {
  const brut = normaliser(nomSaisi);
  const { data: personnes } = await supabase
    .from('personnes')
    .select('prenom, nom')
    .eq('supprime', false);

  const tokens = brut.split(' ').filter(Boolean);
  const prenomCible = tokens[0] ?? '';
  const initialeCible = tokens.length > 1 ? tokens[tokens.length - 1].charAt(0) : null;

  const trouve = (personnes ?? []).find((p) => {
    const prenomMembre = normaliser(p.prenom ?? '');
    if (prenomMembre !== prenomCible) return false;
    if (!initialeCible) return true;
    return normaliser(p.nom ?? '').charAt(0) === initialeCible;
  });

  if (trouve) {
    return { nom: `${trouve.prenom} ${trouve.nom}`, estMembre: true };
  }
  return { nom: nomSaisi.trim(), estMembre: false };
}

export async function creerManifestation(data: {
  nom: string;
  dateDebut: string;
  dateFin: string;
  lieu?: string;
  type?: string;
  notes?: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.nom || !data.dateDebut) return { ok: false, error: 'Nom et date de début obligatoires.' };

  const saison = data.dateDebut.slice(0, 4);
  const { data: inserted, error } = await supabase
    .from('manifestations')
    .insert({
      saison,
      nom: data.nom,
      date_debut: data.dateDebut,
      date_fin: data.dateFin || data.dateDebut,
      lieu: data.lieu || null,
      type: data.type || null,
      statut: 'Planifiée',
      notes: data.notes || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/manifestations');
  return { ok: true, id: inserted.id };
}

const STATUTS_CONNUS = ['Planifiée', 'Confirmée', 'Annulée', 'Terminée'];

export async function modifierManifestation(
  id: number,
  data: { nom: string; type?: string; statut?: string; dateDebut?: string; dateFin?: string }
): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.nom.trim()) return { ok: false, error: 'Nom obligatoire.' };
  if (data.statut && !STATUTS_CONNUS.includes(data.statut)) {
    return { ok: false, error: 'Statut invalide.' };
  }
  if (data.dateDebut && data.dateFin && data.dateFin < data.dateDebut) {
    return { ok: false, error: 'La date de fin ne peut pas précéder la date de début.' };
  }

  const { error } = await supabase
    .from('manifestations')
    .update({
      nom: data.nom.trim(),
      type: data.type || null,
      ...(data.statut ? { statut: data.statut } : {}),
      ...(data.dateDebut ? { date_debut: data.dateDebut } : {}),
      ...(data.dateFin ? { date_fin: data.dateFin } : {}),
    })
    .eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/manifestations/${id}`);
  revalidatePath('/manifestations');
  return { ok: true };
}

export async function supprimerManifestation(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('manifestations').update({ supprime: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/manifestations');
  return { ok: true };
}

export async function creerCreneau(
  manifestationId: number,
  data: {
    tache: string;
    categorie?: string;
    date: string;
    heureDebut?: string;
    heureFin?: string;
    finImprecise?: boolean;
    postesPrevus?: number;
    notes?: string;
  }
): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.tache || !data.date) return { ok: false, error: 'Tâche et date obligatoires.' };

  const { error } = await supabase.from('creneaux').insert({
    manifestation_id: manifestationId,
    tache: data.tache,
    categorie: data.categorie || 'Autre',
    date: data.date,
    heure_debut: data.heureDebut || null,
    heure_fin: data.heureFin || null,
    fin_imprecise: !!data.finImprecise,
    postes_prevus: data.postesPrevus || 1,
    notes: data.notes || null,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/manifestations/${manifestationId}`);
  return { ok: true };
}

export async function modifierCreneau(
  manifestationId: number,
  creneauId: number,
  data: {
    tache: string;
    categorie?: string;
    date: string;
    heureDebut?: string;
    heureFin?: string;
    finImprecise?: boolean;
    postesPrevus?: number;
  }
): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.tache.trim() || !data.date) return { ok: false, error: 'Tâche et date obligatoires.' };

  const { error } = await supabase
    .from('creneaux')
    .update({
      tache: data.tache.trim(),
      categorie: data.categorie || 'Autre',
      date: data.date,
      heure_debut: data.heureDebut || null,
      heure_fin: data.heureFin || null,
      fin_imprecise: !!data.finImprecise,
      postes_prevus: data.postesPrevus || 1,
    })
    .eq('id', creneauId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/manifestations/${manifestationId}`);
  revalidatePath(`/manifestations/${manifestationId}/planning`);
  return { ok: true };
}

/** Suppression douce d'un créneau (demande via /pb, note #105 : "prévoir de
 *  supprimer une tâche si on s'est trompé, c'est pas prévu") — même pattern
 *  que supprimerManifestation/retirerAffectation (colonne `supprime`, pas
 *  de policy RLS delete). Réservé au CA, comme la création du créneau. */
export async function supprimerCreneau(manifestationId: number, creneauId: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('creneaux').update({ supprime: true }).eq('id', creneauId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/manifestations/${manifestationId}`);
  return { ok: true };
}

export async function ajouterAffectation(
  manifestationId: number,
  creneauId: number,
  nomSaisi: string
): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierAutorise(supabase))) return { ok: false, error: 'Action réservée aux licenciés connectés.' };
  if (!nomSaisi.trim()) return { ok: false, error: 'Nom manquant.' };

  const { nom, estMembre } = await nomCanoniqueEtEstMembre(supabase, nomSaisi);
  const { error } = await supabase.from('affectations').insert({
    creneau_id: creneauId,
    nom,
    statut: 'Confirmé',
    est_membre: estMembre,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/manifestations/${manifestationId}`);
  return { ok: true };
}

export async function retirerAffectation(manifestationId: number, affectationId: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierAutorise(supabase))) return { ok: false, error: 'Action réservée aux licenciés connectés.' };

  const { error } = await supabase.from('affectations').update({ supprime: true }).eq('id', affectationId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/manifestations/${manifestationId}`);
  return { ok: true };
}
