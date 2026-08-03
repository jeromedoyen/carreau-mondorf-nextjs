import type { Metadata } from 'next';
import Link from 'next/link';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { createClient } from '@/lib/supabase/server';
import { ClarificationConcoursForm } from '@/components/ClarificationConcoursForm';
import type { Licencie } from '@/lib/fuzzyMatch';

export const metadata: Metadata = { title: 'Compléter ma déclaration' };

type Dossier = {
  jeton: string;
  saison: string;
  transcript: string;
  ambiguites: { champ: string; question: string }[];
  donnees_extraites: { club?: string | null } | null;
  statut: 'en_attente_reponse' | 'resolu' | 'abandonne';
  personne_declarant_id: number;
};

/** Formulaire de complément d'une déclaration vocale de concours restée
 *  incomplète (03/08/2026) — remplace la réponse par e-mail entrant,
 *  abandonnée faute d'option gratuite chez Resend (plan limité à
 *  1 domaine, déjà utilisé par l'envoi transactionnel). Le jeton fait
 *  office d'accès (non deviné), mais la vérification qui compte reste
 *  côté Server Action : seul le déclarant peut résoudre son propre
 *  dossier — voir repondreClarificationConcours(). */
export default async function ClarifierConcoursPage({ params }: { params: Promise<{ jeton: string }> }) {
  const { jeton } = await params;
  const autorise = await estUtilisateurAutorise();
  if (!autorise) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Connecte-toi avec le compte qui a fait la déclaration pour la compléter.
        </p>
        <Link
          href={`/connexion?apres=/concours/clarifier/${jeton}`}
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const supabase = await createClient();
  const { data: monId } = await supabase.rpc('mon_id_personne');
  const { data: dossierData } = await supabase.rpc('dossier_clarification_par_jeton', { p_jeton: jeton });
  const dossier = dossierData as Dossier | null;

  if (!dossier) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <h1 className="font-display mt-1 text-3xl italic">Déjà traité</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Cette demande de précision n&apos;existe plus ou a déjà été complétée.
        </p>
        <Link href="/concours" className="mt-5 inline-block text-[13px] text-encre-douce underline">
          Retour à mes concours
        </Link>
      </main>
    );
  }

  if (dossier.personne_declarant_id !== monId) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Ce n&apos;est pas ta déclaration</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Ce lien correspond à une déclaration faite par quelqu&apos;un d&apos;autre.
        </p>
      </main>
    );
  }

  const { data: licenciesData } = await supabase.rpc('licencies_saison', { p_saison: dossier.saison });
  const licencies = ((licenciesData ?? []) as Licencie[]).filter((l) => l.id !== monId);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">MA DÉCLARATION</p>
        <h1 className="font-display mt-1 text-4xl italic">Encore une précision</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Voici ce que j&apos;ai compris de ton vocal : « {dossier.transcript} »
        </p>
      </header>

      <ClarificationConcoursForm
        jeton={jeton}
        ambiguites={dossier.ambiguites}
        clubInitial={dossier.donnees_extraites?.club ?? ''}
        licencies={licencies}
      />
    </main>
  );
}
