import { createClient } from './supabase/server';

export type MembreARenouveler = {
  personneId: number;
  nom: string;
  prenom: string;
  email: string;
};

type LignePersonneJointe = { id: number; nom: string; prenom: string; email: string | null; supprime: boolean };

/** Anciens membres (adhésion `anneePrecedente`) qui n'ont pas encore
 *  d'adhésion pour `anneeCible` ET ont déjà un accès de connexion (sinon
 *  le lien de relance vers /moncaro/renouveler les mènerait sur un mur
 *  "Réservé aux licenciés") — Phase E du workflow adhésion. */
export async function getMembresARenouveler(anneePrecedente: string, anneeCible: string): Promise<MembreARenouveler[]> {
  const supabase = await createClient();

  const { data: precedents, error: errPrec } = await supabase
    .from('adhesions')
    .select('personne_id, personnes(id, nom, prenom, email, supprime)')
    .eq('annee', anneePrecedente)
    .eq('supprime', false);
  if (errPrec) throw errPrec;

  const { data: cibles, error: errCible } = await supabase
    .from('adhesions')
    .select('personne_id')
    .eq('annee', anneeCible)
    .eq('supprime', false);
  if (errCible) throw errCible;
  const dejaRenouveles = new Set((cibles ?? []).map((a) => a.personne_id));

  const candidats = (precedents ?? [])
    .map((a) => (Array.isArray(a.personnes) ? a.personnes[0] : a.personnes) as LignePersonneJointe | null)
    .filter((p): p is LignePersonneJointe => !!p && !p.supprime && !!p.email)
    .filter((p, index, tous) => tous.findIndex((autre) => autre.id === p.id) === index)
    .filter((p) => !dejaRenouveles.has(p.id));

  if (!candidats.length) return [];

  const { data: emailsAvecAcces, error: errAcces } = await supabase.rpc('emails_avec_acces', {
    p_emails: candidats.map((p) => p.email as string),
  });
  if (errAcces) throw errAcces;
  const acces = new Set((emailsAvecAcces ?? []).map((e: string) => e.toLowerCase()));

  return candidats
    .filter((p) => acces.has((p.email as string).toLowerCase()))
    .map((p) => ({ personneId: p.id, nom: p.nom, prenom: p.prenom, email: p.email as string }));
}
