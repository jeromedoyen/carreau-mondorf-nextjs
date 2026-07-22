import type { EquipePromotion } from '@/lib/data';

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function Pastilles({ gagnees }: { gagnees: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 4 }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full ${i < gagnees ? 'bg-pin' : 'bg-ligne'}`}
        />
      ))}
    </div>
  );
}

export function CalendrierPromotion({ equipes }: { equipes: EquipePromotion[] }) {
  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      <h3 className="font-display m-0 mb-1 text-xl">Équipes &amp; résultats</h3>
      <p className="m-0 mb-5 text-[12.5px] text-encre-douce">
        Journée multi-clubs : chaque trio de Carreau Mondorf joue 4 parties gagnant/perdant
        contre des adversaires tirés au sort.
      </p>
      <div className="flex flex-col">
        {equipes.map((e) => (
          <div
            key={`${e.journee}-${e.numeroEquipe}`}
            className="grid grid-cols-[42px_50px_1fr_auto] items-center gap-4 border-t border-ligne py-3 text-[13.5px] first:border-t-0 hover:bg-sable/60"
          >
            <span className="font-score text-encre-douce/70">J{e.journee}</span>
            <span className="text-encre-douce">{formatDate(e.date)}</span>
            <span>
              <span className="font-medium">{e.joueurs.join(' · ')}</span>{' '}
              <span className="text-[11px] text-encre-douce/50">
                (Éq. {e.numeroEquipe} · {e.categorie}
                {e.type})
              </span>
            </span>
            <Pastilles gagnees={e.partiesGagnees} />
          </div>
        ))}
      </div>
    </div>
  );
}
