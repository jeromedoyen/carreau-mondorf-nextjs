import { Tabs } from '@/components/Tabs';
import { CalendrierD2 } from '@/components/CalendrierD2';
import { ClassementView } from '@/components/ClassementView';
import { getClassementDivisionD2, getRencontresD2 } from '@/lib/data';

const SAISON_ACTUELLE = '2026';

export default async function NationalD2Page() {
  const [data, rencontres] = await Promise.all([
    getClassementDivisionD2(SAISON_ACTUELLE),
    getRencontresD2(SAISON_ACTUELLE),
  ]);

  return (
    <main className="mx-auto max-w-[1080px] px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl">National D2</h1>
        <p className="m-0 text-[13px] text-[var(--gris-txt)]">
          Carreau Boules &amp; Pétanque Mondorf — Saison {data.saison}
        </p>
      </header>
      <Tabs labels={['Calendrier', 'Classement', 'Statistiques']}>
        <CalendrierD2 key="calendrier" rencontres={rencontres} />
        <ClassementView key="classement" data={data} />
        <div
          key="stats"
          className="rounded-2xl border border-[var(--ligne)] bg-[var(--carte)] p-5 text-[13px] text-[var(--gris-txt)]"
        >
          Statistiques individuelles &amp; binômes/trios — à venir dans une
          prochaine itération de ce prototype.
        </div>
      </Tabs>
    </main>
  );
}
