import type { Metadata } from 'next';
import Link from 'next/link';
import { MembreForm } from '@/components/MembreForm';
import { estMembreCA } from '@/lib/membres';
import { getSaisonActive } from '@/lib/saisons';

export const metadata: Metadata = { title: 'Nouveau membre' };

export default async function NouveauMembrePage() {
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

  const saisonActive = await getSaisonActive();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/membres" className="text-[13px] text-encre-douce hover:text-terracotta">
        ← Membres
      </Link>
      <header className="entree mt-4 mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">RÉSERVÉ AU CA</p>
        <h1 className="font-display mt-1 text-3xl italic">Nouveau membre</h1>
      </header>
      <MembreForm saisonActuelle={saisonActive} />
    </main>
  );
}
