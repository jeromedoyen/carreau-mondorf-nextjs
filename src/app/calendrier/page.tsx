import type { Metadata } from 'next';
import { CalendrierUnifie } from '@/components/CalendrierUnifie';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { getRencontresD2, getCalendrierFederation, fusionnerCalendrier } from '@/lib/data';
import { getSaisons, getSaisonActive } from '@/lib/saisons';

export const metadata: Metadata = { title: 'Calendrier' };

export default async function CalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const [{ saison: saisonDemandee }, saisons, saisonActive] = await Promise.all([
    searchParams,
    getSaisons(),
    getSaisonActive(),
  ]);
  const saison = saisonDemandee ?? saisonActive;

  const [rencontres, federation] = await Promise.all([
    getRencontresD2(saison),
    getCalendrierFederation(saison),
  ]);
  const items = fusionnerCalendrier(rencontres, federation);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">SAISON {saison}</p>
          <h1 className="font-display mt-1 text-4xl italic">Calendrier</h1>
          <p className="mt-2 max-w-xl text-[13.5px] text-encre-douce">
            National D2, journées Promotion, tournois et Coupe de Luxembourg —
            tout ce qui rythme la saison, en un coup d’œil.
          </p>
        </div>
        <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
      </header>
      <CalendrierUnifie items={items} />
    </main>
  );
}
