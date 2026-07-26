import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { RegistreMembres } from '@/components/RegistreMembres';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { getRegistreMembres, estMembreCA } from '@/lib/membres';
import { getSaisons, getSaisonActive } from '@/lib/saisons';

export const metadata: Metadata = { title: 'Membres & licenciés' };

export default async function MembresPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
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

  const [{ saison: saisonDemandee }, saisons, saisonActive] = await Promise.all([
    searchParams,
    getSaisons(),
    getSaisonActive(),
  ]);
  const saison = saisonDemandee ?? saisonActive;
  const personnes = await getRegistreMembres(saison);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
            SAISON {saison} · RÉSERVÉ AU CA
          </p>
          <h1 className="font-display mt-1 text-4xl italic">Membres &amp; licenciés</h1>
        </div>
        <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
      </header>

      <div className="mb-6">
        <Link
          href="/membres/nouveau"
          className="inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
        >
          <Plus size={15} />
          Nouveau membre
        </Link>
      </div>

      <RegistreMembres personnes={personnes} />
    </main>
  );
}
