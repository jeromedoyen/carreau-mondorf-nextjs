import type { Metadata } from 'next';
import { Tabs } from '@/components/Tabs';
import { CalendrierD2 } from '@/components/CalendrierD2';
import { ClassementView } from '@/components/ClassementView';
import { StatistiquesD2 } from '@/components/StatistiquesD2';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { getClassementDivisionD2, getRencontresD2 } from '@/lib/data';
import { getSaisons, getSaisonActive } from '@/lib/saisons';

export const metadata: Metadata = { title: 'National D2' };

export default async function NationalD2Page({
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

  const [data, rencontres] = await Promise.all([
    getClassementDivisionD2(saison),
    getRencontresD2(saison),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
            SAISON {data.saison}
          </p>
          <h1 className="font-display mt-1 text-4xl italic">National D2</h1>
        </div>
        <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
      </header>
      <Tabs labels={['Calendrier', 'Classement', 'Statistiques']}>
        <CalendrierD2 key="calendrier" rencontres={rencontres} />
        <ClassementView key="classement" data={data} />
        <StatistiquesD2 key="stats" saison={saison} />
      </Tabs>
    </main>
  );
}
