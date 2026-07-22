import type { mockEquipesPromotion } from '@/lib/mock-data';

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CalendrierPromotion({ equipes }: { equipes: typeof mockEquipesPromotion }) {
  return (
    <div className="rounded-2xl border border-[var(--ligne)] bg-[var(--carte)] p-5 shadow-[0_1px_3px_rgba(26,26,23,.04),0_1px_2px_rgba(26,26,23,.03)]">
      <h3 className="m-0 mb-1 text-base">Équipes &amp; résultats</h3>
      <p className="m-0 mb-4 text-[12.5px] text-[var(--gris-txt)]">
        Journée multi-clubs : chaque trio de Carreau Mondorf joue 4 parties gagnant/perdant
        contre des adversaires tirés au sort.
      </p>
      <div className="flex flex-col">
        {equipes.map((e) => (
          <div
            key={`${e.journee}-${e.numeroEquipe}`}
            className="grid grid-cols-[50px_90px_1fr_60px] items-center gap-3 border-t border-[var(--ligne)] py-2.5 text-[13px] first:border-t-0"
          >
            <span className="font-[family-name:var(--font-oswald)] text-[var(--gris-txt)]">
              J{e.journee}
            </span>
            <span className="text-[var(--gris-txt)]">{formatDate(e.date)}</span>
            <span>
              {e.joueurs.join(' + ')}{' '}
              <span className="text-[11px] text-[var(--gris-clair)]">
                (Éq. {e.numeroEquipe} · {e.categorie}{e.type})
              </span>
            </span>
            <span
              className={`text-right font-semibold ${
                e.partiesGagnees >= 3 ? 'text-[var(--vert)]' : 'text-[var(--rouge-dark)]'
              }`}
            >
              {e.partiesGagnees}/4
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
