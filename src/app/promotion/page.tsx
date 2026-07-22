import { Tabs } from '@/components/Tabs';
import { CalendrierPromotion } from '@/components/CalendrierPromotion';
import { getEquipesPromotion } from '@/lib/data';

const SAISON_PROMOTION = '2025'; // seule saison disponible pour l'instant (championnat clos)

export default async function PromotionPage() {
  const equipes = await getEquipesPromotion(SAISON_PROMOTION);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
          SAISON {SAISON_PROMOTION} · CHAMPIONNAT CLOS
        </p>
        <h1 className="font-display mt-1 text-4xl italic">Promotion</h1>
      </header>
      <Tabs labels={['Calendrier', 'Statistiques']}>
        <CalendrierPromotion key="calendrier" equipes={equipes} />
        <div
          key="stats"
          className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce"
        >
          Statistiques individuelles &amp; trios — à venir dans une prochaine
          itération de ce prototype.
        </div>
      </Tabs>
    </main>
  );
}
