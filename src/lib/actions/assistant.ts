'use server';

import { createClient } from '@/lib/supabase/server';
import { getMeteoDuJour, type Meteo } from '@/lib/meteo';

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Salutation dans la langue associée à la nationalité de la personne
 *  (28/07/2026, demande Jérôme) — couvre les nationalités les plus
 *  courantes au club (registre des membres) ; "Bonjour" par défaut si la
 *  nationalité est absente ou non reconnue. */
const SALUTATIONS: { motsCles: string[]; salutation: string }[] = [
  { motsCles: ['luxembourg'], salutation: 'Moien' },
  { motsCles: ['portugal', 'portugais'], salutation: 'Olá' },
  { motsCles: ['italie', 'italien'], salutation: 'Ciao' },
  { motsCles: ['espagn'], salutation: 'Hola' },
  { motsCles: ['allemagn', 'allemand'], salutation: 'Hallo' },
  { motsCles: ['pays-bas', 'neerland', 'hollandais'], salutation: 'Hallo' },
  { motsCles: ['royaume-uni', 'anglais', 'britannique'], salutation: 'Hello' },
  { motsCles: ['belg'], salutation: 'Bonjour' },
  { motsCles: ['france', 'francais', 'française'], salutation: 'Bonjour' },
];

function salutationPourNationalite(nationalite: string | null): string {
  if (!nationalite) return 'Bonjour';
  const normalisee = sansAccents(nationalite);
  const trouvee = SALUTATIONS.find((s) => s.motsCles.some((mot) => normalisee.includes(mot)));
  return trouvee?.salutation ?? 'Bonjour';
}

export type AccueilAssistant = {
  prenom: string | null;
  salutation: string;
  meteo: Meteo | null;
};

/** Données de la carte d'accueil affichée à la première ouverture du chat
 *  (28/07/2026) : prénom + salutation dans la langue de la nationalité
 *  déclarée, et la météo du jour. Ne fait rien qui nécessite une garde CA
 *  — un simple licencié connecté peut voir sa propre fiche (le rapproche
 *  par email de session, jamais par un identifiant fourni par le client). */
export async function obtenirAccueilAssistant(): Promise<AccueilAssistant> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let prenom: string | null = null;
  let nationalite: string | null = null;

  if (user?.email) {
    // mon_identite() (migration 0039) : RPC security definer scopée à la
    // session courante — `personnes` reste CA-only en lecture directe
    // (RLS, 0004_registre_membres.sql), même principe que mon_adhesion().
    const { data } = await supabase.rpc('mon_identite');
    prenom = data?.prenom ?? null;
    nationalite = data?.nationalite ?? null;
  }

  let meteo: Meteo | null = null;
  try {
    meteo = await getMeteoDuJour();
  } catch {
    meteo = null;
  }

  return { prenom, salutation: salutationPourNationalite(nationalite), meteo };
}
