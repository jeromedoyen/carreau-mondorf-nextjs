import type { Metadata } from 'next';
import Link from 'next/link';
import { RegistreMembres } from '@/components/RegistreMembres';
import { getRegistreMembres, estMembreCA } from '@/lib/membres';

export const metadata: Metadata = { title: 'Membres & licenciés' };

const ANNEE_ACTUELLE = '2026';

export default async function MembresPage() {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Réservé au comité</h1>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] text-encre-douce">
          Cette page est réservée aux membres du comité d&apos;administration,
          connectés avec leur adresse autorisée.
        </p>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const personnes = await getRegistreMembres(ANNEE_ACTUELLE);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
          SAISON {ANNEE_ACTUELLE} · RÉSERVÉ AU CA
        </p>
        <h1 className="font-display mt-1 text-4xl italic">Membres &amp; licenciés</h1>
      </header>
      <RegistreMembres personnes={personnes} />
    </main>
  );
}
