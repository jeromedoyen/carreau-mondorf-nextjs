import type { RencontreD2 } from '@/lib/data';

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function CalendrierD2({ rencontres }: { rencontres: RencontreD2[] }) {
  return (
    <div className="rounded-2xl border border-[var(--ligne)] bg-[var(--carte)] p-5 shadow-[0_1px_3px_rgba(26,26,23,.04),0_1px_2px_rgba(26,26,23,.03)]">
      <h3 className="m-0 mb-4 text-base">Calendrier &amp; résultats</h3>
      <div className="flex flex-col">
        {rencontres.map((r) => (
          <div
            key={r.journee}
            className="grid grid-cols-[50px_90px_1fr_90px] items-center gap-3 border-t border-[var(--ligne)] py-2.5 text-[13px] first:border-t-0"
          >
            <span className="font-[family-name:var(--font-oswald)] text-[var(--gris-txt)]">
              J{r.journee}
            </span>
            <span className="text-[var(--gris-txt)]">{formatDate(r.date)}</span>
            {r.statut === 'Exempt' ? (
              <span className="italic text-[var(--gris-clair)]">Exempt</span>
            ) : (
              <span className={r.statut === 'Prévue' ? 'text-[var(--gris-clair)]' : ''}>
                {r.domicile ? 'Carreau Mondorf' : r.adversaire} —{' '}
                {r.domicile ? r.adversaire : 'Carreau Mondorf'}
              </span>
            )}
            <span
              className={
                r.statut === 'Jouée'
                  ? r.scoreCM! > r.scoreAdverse!
                    ? 'font-semibold text-[var(--vert)]'
                    : 'font-semibold text-[var(--rouge-dark)]'
                  : 'text-[var(--gris-clair)]'
              }
            >
              {r.statut === 'Jouée' ? `${r.scoreCM} — ${r.scoreAdverse}` : r.statut === 'Prévue' ? 'À venir' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
