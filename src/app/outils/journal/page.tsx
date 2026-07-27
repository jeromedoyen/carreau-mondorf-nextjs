import type { Metadata } from 'next';
import Link from 'next/link';
import { estMembreCA } from '@/lib/membres';
import { getJournal } from '@/lib/journal';
import { ListeJournal } from '@/components/ListeJournal';

export const metadata: Metadata = { title: 'Journal des actions' };

export default async function JournalPage() {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Réservé au comité</h1>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const entrees = await getJournal();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">Journal des actions</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Trace de qui a créé ou modifié quoi, pour tous les membres du CA — 200 dernières actions. Généré
          automatiquement, aucune saisie manuelle possible.
        </p>
      </header>

      <ListeJournal entrees={entrees} />
    </main>
  );
}
