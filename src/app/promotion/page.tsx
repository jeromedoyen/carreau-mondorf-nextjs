import { Tabs } from '@/components/Tabs';
import { CalendrierPromotion } from '@/components/CalendrierPromotion';
import { mockEquipesPromotion } from '@/lib/mock-data';

export default function PromotionPage() {
  // TODO (tâche #6) : données illustratives — remplacer par l'import réel.
  const equipes = mockEquipesPromotion;

  return (
    <main className="mx-auto max-w-[1080px] px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl">Promotion</h1>
        <p className="m-0 text-[13px] text-[var(--gris-txt)]">
          Carreau Boules &amp; Pétanque Mondorf — Saison 2026
        </p>
      </header>
      <Tabs
        tabs={[
          { label: 'Calendrier', content: <CalendrierPromotion equipes={equipes} /> },
          {
            label: 'Statistiques',
            content: (
              <div className="rounded-2xl border border-[var(--ligne)] bg-[var(--carte)] p-5 text-[13px] text-[var(--gris-txt)]">
                Statistiques individuelles &amp; trios — à venir dans une prochaine
                itération de ce prototype.
              </div>
            ),
          },
        ]}
      />
    </main>
  );
}
