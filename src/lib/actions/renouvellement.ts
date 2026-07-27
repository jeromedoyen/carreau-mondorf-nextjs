'use server';

import { createClient } from '@/lib/supabase/server';
import { envoyerEmail } from '@/lib/email';
import { emailRelanceRenouvellement } from '@/lib/emailTemplates';
import { getMembresARenouveler } from '@/lib/renouvellement';

type Resultat = { ok: true; envoyes: number; echecs: string[] } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

/** Phase E du workflow adhésion : "Lancer le renouvellement {année}" — un
 *  email de relance par ancien membre (saison précédente, pas encore
 *  d'adhésion pour `anneeCible`, accès de connexion déjà existant — cf.
 *  getMembresARenouveler()). N'écrit rien en base côté adhésions : le
 *  renouvellement effectif passe toujours par le formulaire de
 *  réinscription (/moncaro/renouveler, Phase B) rempli par la personne
 *  elle-même — jamais une recopie automatique (décision explicite de
 *  Jérôme, 27/07/2026). Un échec d'envoi individuel n'interrompt jamais
 *  la relance des suivants — juste comptabilisé dans `echecs`. */
export async function envoyerRelancesRenouvellement(anneeCible: string): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (!anneeCible.trim()) return { ok: false, error: 'Saison cible manquante.' };

  const anneePrecedente = String(Number(anneeCible) - 1);
  const membres = await getMembresARenouveler(anneePrecedente, anneeCible);

  let envoyes = 0;
  const echecs: string[] = [];
  for (const m of membres) {
    try {
      await envoyerEmail({
        destinataire: m.email,
        sujet: `La saison ${anneeCible} est ouverte — renouvelle ton adhésion`,
        html: emailRelanceRenouvellement({ prenom: m.prenom, annee: anneeCible }),
      });
      envoyes += 1;
    } catch {
      echecs.push(`${m.prenom} ${m.nom}`);
    }
  }

  return { ok: true, envoyes, echecs };
}
