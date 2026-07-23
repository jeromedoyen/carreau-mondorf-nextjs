import type { Metadata } from 'next';
import { Tabs } from '@/components/Tabs';
import { CalendrierD2 } from '@/components/CalendrierD2';
import { ClassementView } from '@/components/ClassementView';
import { StatistiquesD2 } from '@/components/StatistiquesD2';
import { getClassementDivisionD2, getRencontresD2 } from '@/lib/data';

export const metadata: Metadata = { title: 'National D2' };

const SAISON_ACTUELLE = '2026';

export default async function NationalD2Page() {
  const [data, rencontres] = await Promise.all([
    getClassementDivisionD2(SAISON_ACTUELLE),
    getRencontresD2(SAISON_ACTUELLE),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
          SAISON {data.saison}
        </p>
        <h1 className="font-display mt-1 text-4xl italic">National D2</h1>
      </header>
      <Tabs labels={['Calendrier', 'Classement', 'Statistiques']}>
        <CalendrierD2 key="calendrier" rencontres={rencontres} />
        <ClassementView key="classement" data={data} />
        <StatistiquesD2 key="stats" saison={SAISON_ACTUELLE} />
      </Tabs>
    </main>
  );
}
