import { Tabs } from '@/components/Tabs';
import { CalendrierD2 } from '@/components/CalendrierD2';
import { ClassementView } from '@/components/ClassementView';
import { mockClassementD2, mockRencontresD2 } from '@/lib/mock-data';

export default function NationalD2Page() {
  // TODO (tâche #6) : remplacer les données mock par une lecture Supabase
  // une fois l'import CSV effectué. La forme des données ne change pas.
  const data = mockClassementD2;
  const rencontres = mockRencontresD2;

  return (
    <main className="mx-auto max-w-[1080px] px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl">National D2</h1>
        <p className="m-0 text-[13px] text-[var(--gris-txt)]">
          Carreau Boules &amp; Pétanque Mondorf — Saison {data.saison}
        </p>
      </header>
      <Tabs
        tabs={[
          { label: 'Calendrier', content: <CalendrierD2 rencontres={rencontres} /> },
          { label: 'Classement', content: <ClassementView data={data} /> },
          {
            label: 'Statistiques',
            content: (
              <div className="rounded-2xl border border-[var(--ligne)] bg-[var(--carte)] p-5 text-[13px] text-[var(--gris-txt)]">
                Statistiques individuelles &amp; binômes/trios — à venir dans une
                prochaine itération de ce prototype.
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
