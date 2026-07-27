import { createClient } from './supabase/server';

export type FicheMembre = {
  id: number;
  nom: string;
  prenom: string;
  sexe: string | null;
  dateNaissance: string | null;
  nationalite: string | null;
  adresse: string | null;
  codePostalVille: string | null;
  telephone: string | null;
  email: string | null;
  droitImage: boolean | null;
  adhesion: {
    type: string;
    licence: string | null;
    categorie: string | null;
    classe: string | null;
    cotisationPayee: boolean | null;
    cotisationDate: string | null;
    cotisationMontant: number | null;
    licencePayee: boolean | null;
    licenceDate: string | null;
    licenceMontant: number | null;
  } | null;
};

/** Données de la fiche membre imprimable (classeur papier, 27/07/2026,
 *  demande Jérôme) — requête dédiée plutôt que getRegistreMembres()
 *  (membres.ts) : la fiche a besoin des dates/montants de paiement que
 *  l'écran de registre n'affiche pas, pas la peine d'alourdir cette
 *  requête-là pour tout le monde. Mêmes garanties RLS ("lecture CA
 *  uniquement", 0004_registre_membres.sql). */
export async function getFichesMembres(annee: string): Promise<FicheMembre[]> {
  const supabase = await createClient();

  const { data: personnes, error: errP } = await supabase
    .from('personnes')
    .select('id, nom, prenom, sexe, date_naissance, nationalite, adresse, code_postal_ville, telephone, email, droit_image')
    .eq('supprime', false)
    .order('nom', { ascending: true });
  if (errP) throw errP;

  const { data: adhesions, error: errA } = await supabase
    .from('adhesions')
    .select(
      'personne_id, type, licence, categorie, classe, cotisation_payee, cotisation_date, cotisation_montant, licence_payee, licence_date, licence_montant'
    )
    .eq('annee', annee)
    .eq('supprime', false);
  if (errA) throw errA;

  const adhesionParPersonne = new Map((adhesions ?? []).map((a) => [a.personne_id, a]));

  return (personnes ?? []).map((p) => {
    const a = adhesionParPersonne.get(p.id);
    return {
      id: p.id,
      nom: p.nom,
      prenom: p.prenom,
      sexe: p.sexe,
      dateNaissance: p.date_naissance,
      nationalite: p.nationalite,
      adresse: p.adresse,
      codePostalVille: p.code_postal_ville,
      telephone: p.telephone,
      email: p.email,
      droitImage: p.droit_image,
      adhesion: a
        ? {
            type: a.type,
            licence: a.licence,
            categorie: a.categorie,
            classe: a.classe,
            cotisationPayee: a.cotisation_payee,
            cotisationDate: a.cotisation_date,
            cotisationMontant: a.cotisation_montant,
            licencePayee: a.licence_payee,
            licenceDate: a.licence_date,
            licenceMontant: a.licence_montant,
          }
        : null,
    };
  });
}
