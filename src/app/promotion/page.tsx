import { Tabs } from '@/components/Tabs';
import { CalendrierPromotion } from '@/components/CalendrierPromotion';
import { StatistiquesPromotion } from '@/components/StatistiquesPromotion';
import { getEquipesPromotion } from '@/lib/data';
import { getStatistiquesPromotion } from '@/lib/stats';
import { supabase } from '@/lib/supabase';

const SAISON_PROMOTION = '2025'; // seule saison disponible pour l'instant (championnat clos)

export default async function PromotionPage() {
  const [equipes, stats] = await Promise.all([
    getEquipesPromotion(SAISON_PROMOTION),
    getStatistiquesPromotion(supabase, SAISON_PROMOTION),
  ]);

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
        <StatistiquesPromotion key="stats" stats={stats} />
      </Tabs>
    </main>
  );
}
