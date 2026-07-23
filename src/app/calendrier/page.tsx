import type { Metadata } from 'next';
import { CalendrierUnifie } from '@/components/CalendrierUnifie';
import { getRencontresD2, getCalendrierFederation, fusionnerCalendrier } from '@/lib/data';

export const metadata: Metadata = { title: 'Calendrier' };

const SAISON_ACTUELLE = '2026';

export default async function CalendrierPage() {
  const [rencontres, federation] = await Promise.all([
    getRencontresD2(SAISON_ACTUELLE),
    getCalendrierFederation(SAISON_ACTUELLE),
  ]);
  const items = fusionnerCalendrier(rencontres, federation);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
          SAISON {SAISON_ACTUELLE}
        </p>
        <h1 className="font-display mt-1 text-4xl italic">Calendrier</h1>
        <p className="mt-2 max-w-xl text-[13.5px] text-encre-douce">
          National D2, journées Promotion, tournois et Coupe de Luxembourg —
          tout ce qui rythme la saison, en un coup d’œil.
        </p>
      </header>
      <CalendrierUnifie items={items} />
    </main>
  );
}
