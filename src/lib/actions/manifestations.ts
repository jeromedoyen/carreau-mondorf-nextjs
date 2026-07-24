'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierAutorise(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_utilisateur_autorise');
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
  if (!(await verifierAutorise(supabase))) return { ok: false, error: 'Action réservée aux licenciés connectés.' };
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
  if (!(await verifierAutorise(supabase))) return { ok: false, error: 'Action réservée aux licenciés connectés.' };
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
