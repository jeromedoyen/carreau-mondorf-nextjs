import { Tabs } from '@/components/Tabs';
import { CalendrierPromotion } from '@/components/CalendrierPromotion';
import { getEquipesPromotion } from '@/lib/data';

const SAISON_PROMOTION = '2025'; // seule saison disponible pour l'instant (championnat clos)

export default async function PromotionPage() {
  const equipes = await getEquipesPromotion(SAISON_PROMOTION);

  return (
    <main className="mx-auto max-w-[1080px] px-5 py-8">
      <header className="mb-6">
        <h1 className="text-2xl">Promotion</h1>
        <p className="m-0 text-[13px] text-[var(--gris-txt)]">
          Carreau Boules &amp; Pétanque Mondorf — Saison {SAISON_PROMOTION}
        </p>
      </header>
      <Tabs labels={['Calendrier', 'Statistiques']}>
        <CalendrierPromotion key="calendrier" equipes={equipes} />
        <div
          key="stats"
          className="rounded-2xl border border-[var(--ligne)] bg-[var(--carte)] p-5 text-[13px] text-[var(--gris-txt)]"
        >
          Statistiques individuelles &amp; trios — à venir dans une prochaine
          itération de ce prototype.
        </div>
      </Tabs>
    </main>
  );
}
