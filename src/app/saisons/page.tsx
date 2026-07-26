import type { Metadata } from 'next';
import Link from 'next/link';
import { NouvelleSaisonForm } from '@/components/NouvelleSaisonForm';
import { ListeSaisons } from '@/components/ListeSaisons';
import { getSaisons } from '@/lib/saisons';
import { estMembreCA } from '@/lib/membres';

export const metadata: Metadata = { title: 'Saisons' };

export default async function SaisonsPage() {
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

  const saisons = await getSaisons();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">RÉSERVÉ AU CA</p>
        <h1 className="font-display mt-1 text-4xl italic">Saisons</h1>
        <p className="mt-2 max-w-md text-[13px] text-encre-douce">
          La saison active est celle affichée par défaut sur tout le site (Compétition, Manifestations,
          Congés, Membres...). Créez la saison suivante ici en fin de saison — pas besoin d&apos;attendre
          une intervention technique.
        </p>
      </header>

      <NouvelleSaisonForm />
      <ListeSaisons saisons={saisons} />
    </main>
  );
}
