import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { MembreForm } from '@/components/MembreForm';
import { getPersonne, estMembreCA } from '@/lib/membres';
import { getSaisonActive } from '@/lib/saisons';

export const metadata: Metadata = { title: 'Modifier un membre' };

export default async function ModifierMembrePage({ params }: { params: Promise<{ id: string }> }) {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
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

  const { id } = await params;
  const saisonActive = await getSaisonActive();
  const personne = await getPersonne(Number(id), saisonActive);
  if (!personne) notFound();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/membres" className="text-[13px] text-encre-douce hover:text-terracotta">
        ← Membres
      </Link>
      <header className="entree mt-4 mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">RÉSERVÉ AU CA</p>
        <h1 className="font-display mt-1 text-3xl italic">
          {personne.prenom} {personne.nom}
        </h1>
        {/* Raccourci vers ce que ce membre voit de son propre espace —
            utile pour l'accompagner au téléphone, ou vérifier ce qui
            s'affiche chez lui. N'ouvre aucun accès nouveau : le CA lit
            déjà ces données. */}
        <Link
          href={`/membres/${id}/tableau-de-bord`}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-ligne bg-sable-carte px-3 py-1.5 text-[13px] text-encre transition-colors hover:border-terracotta hover:text-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          <LayoutDashboard size={14} className="shrink-0 text-terracotta" aria-hidden="true" />
          Voir son tableau de bord
        </Link>
      </header>
      <MembreForm personne={personne} saisonActuelle={saisonActive} />
    </main>
  );
}
