'use server';

import { revalidatePath } from 'next/cache';
import * as XLSX from 'xlsx';
import { createClient } from '@/lib/supabase/server';
import { comparerLicencies, type LicencieClub, type LigneFederation, type LigneRapport } from '@/lib/federationCompare';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

export type EvenementFederationSaisi = {
  libelle: string;
  date: string;
  dateFin?: string;
  categorie: string;
  lieu?: string;
  domicile?: string;
  concerneClub?: boolean;
  notes?: string;
};

export async function creerEvenementFederation(data: EvenementFederationSaisi): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!data.libelle || !data.date) return { ok: false, error: 'Libellé et date obligatoires.' };

  const saison = data.date.slice(0, 4);
  const { data: inserted, error } = await supabase
    .from('calendrier_federation')
    .insert({
      saison,
      date: data.date,
      date_fin: data.dateFin || data.date,
      libelle: data.libelle,
      categorie: data.categorie || null,
      lieu: data.lieu || null,
      domicile: data.domicile === 'Oui' ? true : data.domicile === 'Non' ? false : null,
      concerne_club: !!data.concerneClub,
      notes: data.notes || null,
    })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath('/federation/calendrier');
  revalidatePath('/calendrier');
  return { ok: true, id: inserted.id };
}

export async function supprimerEvenementFederation(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const { error } = await supabase.from('calendrier_federation').update({ supprime: true }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/federation/calendrier');
  revalidatePath('/calendrier');
  return { ok: true };
}

// ============================================================
// CONTRÔLE FÉDÉRATION FLBP — port de comparerFichierFederation()/
// appliquerCorrectionFederation() (carreau-mondorf-app/Code.gs).
// ============================================================

type ResultatControle = { ok: true; rapport: LigneRapport[] } | { ok: false; error: string };

/** Lit le classeur Excel envoyé (1ère feuille) et le convertit en tableau
 *  d'objets clé/valeur (en-têtes = 1ère ligne) — équivalent de
 *  parserFichierFederation_() côté v1, sans le détour par Drive (xlsx lit
 *  directement le buffer). */
function parserClasseurFederation(buffer: ArrayBuffer): LigneFederation[] {
  const classeur = XLSX.read(buffer, { type: 'buffer', cellDates: false });
  const feuille = classeur.Sheets[classeur.SheetNames[0]];
  return XLSX.utils.sheet_to_json<LigneFederation>(feuille, { raw: false, defval: '' });
}

export async function comparerFichierFederation(formData: FormData): Promise<ResultatControle> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const fichier = formData.get('fichier');
  const saison = String(formData.get('saison') ?? '');
  if (!(fichier instanceof File) || !saison) {
    return { ok: false, error: 'Fichier et saison requis.' };
  }

  let licenciesFederation: LigneFederation[];
  try {
    const buffer = await fichier.arrayBuffer();
    licenciesFederation = parserClasseurFederation(buffer);
  } catch {
    return { ok: false, error: "Fichier illisible — vérifiez que c'est bien un export Excel (.xlsx/.xls) de la fédération." };
  }

  const { data: personnesData, error: errP } = await supabase
    .from('personnes')
    .select('id, nom, prenom, date_naissance')
    .eq('supprime', false);
  if (errP) return { ok: false, error: errP.message };
  const personneParId = new Map((personnesData ?? []).map((p) => [p.id, p]));

  const { data: adhesionsData, error: errA } = await supabase
    .from('adhesions')
    .select('id, personne_id, licence, categorie, classe')
    .eq('annee', saison)
    .eq('type', 'Licencié')
    .eq('supprime', false);
  if (errA) return { ok: false, error: errA.message };

  const licenciesClub: LicencieClub[] = (adhesionsData ?? []).flatMap((a) => {
    const p = personneParId.get(a.personne_id);
    if (!p) return [];
    return [
      {
        idPersonne: p.id,
        idAdhesion: a.id,
        nom: p.nom,
        prenom: p.prenom,
        dateNaissance: p.date_naissance,
        licence: a.licence,
        categorie: a.categorie,
        classe: a.classe,
      },
    ];
  });

  const rapport = comparerLicencies(licenciesClub, licenciesFederation);

  const compte = { OK: 0, DIVERGENCE: 0, MANQUANT_CLUB: 0, MANQUANT_FEDERATION: 0 };
  rapport.forEach((l) => compte[l.statut]++);
  const { error: errInsert } = await supabase.from('controles_federation').insert({
    saison,
    nom_fichier: fichier.name,
    nb_ok: compte.OK,
    nb_divergence: compte.DIVERGENCE,
    nb_manquant_club: compte.MANQUANT_CLUB,
    nb_manquant_federation: compte.MANQUANT_FEDERATION,
  });
  if (errInsert) return { ok: false, error: errInsert.message };

  revalidatePath('/federation');
  return { ok: true, rapport };
}

/** Applique la valeur fédération sur le champ concerné. Nom/Prénom vivent
 *  sur `personnes`, Licence/Catégorie/Classe sur `adhesions` — contrairement
 *  à la v1 (qui ne cherchait la colonne que dans Adhésions et échouait
 *  silencieusement pour Nom/Prénom), on met à jour la bonne table selon le
 *  champ. */
export async function appliquerCorrectionFederation(
  idPersonne: number,
  idAdhesion: number,
  champ: string,
  nouvelleValeur: string
): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };

  const cible: Record<string, { table: 'personnes' | 'adhesions'; colonne: string; id: number }> = {
    Nom: { table: 'personnes', colonne: 'nom', id: idPersonne },
    Prénom: { table: 'personnes', colonne: 'prenom', id: idPersonne },
    Licence: { table: 'adhesions', colonne: 'licence', id: idAdhesion },
    Catégorie: { table: 'adhesions', colonne: 'categorie', id: idAdhesion },
    Classe: { table: 'adhesions', colonne: 'classe', id: idAdhesion },
  };
  const c = cible[champ];
  if (!c) return { ok: false, error: 'Champ non pris en charge : ' + champ };

  const { error } = await supabase.from(c.table).update({ [c.colonne]: nouvelleValeur }).eq('id', c.id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/membres');
  return { ok: true };
}
