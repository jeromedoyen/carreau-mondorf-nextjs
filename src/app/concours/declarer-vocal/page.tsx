import type { Metadata } from 'next';
import Link from 'next/link';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { getSaisonActive } from '@/lib/saisons';
import { DeclarationVocaleForm } from '@/components/DeclarationVocaleForm';

export const metadata: Metadata = { title: 'Déclarer au vocal' };

/** Le traitement enchaîne transcription (service Render gratuit, mis en
 *  veille après inactivité — le réveil coûte plusieurs secondes) puis
 *  extraction par le modèle : la durée par défaut d'une fonction Vercel ne
 *  suffit pas au premier appel de la journée. */
export const maxDuration = 120;

/** Déclaration d'un concours par enregistrement vocal + selfie d'équipe
 *  (idée Jérôme du 03/08/2026). Chemin alternatif au formulaire de
 *  /concours, pensé pour le téléphone au bord du terrain. Même garde
 *  d'accès que /concours : tout licencié connecté. */
export default async function DeclarerVocalPage() {
  const autorise = await estUtilisateurAutorise();
  if (!autorise) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const saison = await getSaisonActive();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">MES CONCOURS</p>
        <h1 className="font-display mt-1 text-4xl italic">Déclarer au vocal</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Au bord du terrain, enregistre ta participation en parlant plutôt qu&apos;en remplissant le formulaire.
        </p>
      </header>

      <DeclarationVocaleForm saison={saison} />

      <Link href="/concours" className="mt-6 inline-block text-[13px] text-encre-douce underline">
        ← Revenir au formulaire et à mes participations
      </Link>
    </main>
  );
}
