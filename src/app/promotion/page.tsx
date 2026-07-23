import type { Metadata } from 'next';
import { PromotionContent } from '@/components/PromotionContent';

export const metadata: Metadata = { title: 'Promotion' };

const SAISON_PROMOTION = '2025'; // seule saison disponible pour l'instant (championnat clos)

export default function PromotionPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
          SAISON {SAISON_PROMOTION} · CHAMPIONNAT CLOS
        </p>
        <h1 className="font-display mt-1 text-4xl italic">Promotion</h1>
      </header>
      <PromotionContent saison={SAISON_PROMOTION} />
    </main>
  );
}
