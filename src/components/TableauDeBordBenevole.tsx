import { CalendarDays, Clock, HeartHandshake, ListChecks } from 'lucide-react';
import type { TableauDeBordBenevole as TableauDeBordBenevoleType, ParticipationBenevole } from '@/lib/benevolat';

const COULEURS_CATEGORIE: Record<string, string> = {
  Préparation: '#C97B4A',
  Cuisine: '#D9A441',
  Bar: '#8A6D4A',
  'Table de marque': '#3E5C76',
  'Temps fort': '#B4483E',
  Service: '#6B8F71',
  Vaisselle: '#7A7A8C',
  Barbecue: '#A0522D',
  Autre: '#9C9384',
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function LigneParticipation({ p }: { p: ParticipationBenevole }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-ligne py-2.5 text-[13px] first:border-t-0">
      <div>
        <span className="font-medium text-encre">{p.tache}</span>
        <span className="ml-2 text-encre-douce">{p.manifestationNom}</span>
      </div>
      <span className="shrink-0 text-encre-douce">{formatDate(p.date)}</span>
    </div>
  );
}

export function TableauDeBordBenevole({ tableau }: { tableau: TableauDeBordBenevoleType }) {
  const maxAnnee = Math.max(...tableau.parAnnee.map((a) => a.nombre), 1);
  const maxCategorie = Math.max(...tableau.parCategorie.map((c) => c.nombre), 1);

  return (
    <div className="flex flex-col gap-8">
      {/* ---------- Chiffres clés ---------- */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Participations', valeur: tableau.total, Icon: HeartHandshake },
          { label: 'Réalisées', valeur: tableau.totalPassees, Icon: ListChecks },
          { label: 'À venir', valeur: tableau.totalAVenir, Icon: CalendarDays },
          { label: 'Heures cumulées', valeur: `${tableau.heuresTotal}h`, Icon: Clock },
        ].map(({ label, valeur, Icon }) => (
          <div key={label} className="rounded-2xl border border-ligne bg-sable-carte p-4 text-center">
            <Icon size={18} className="mx-auto mb-1.5 text-pin" />
            <div className="font-score text-2xl">{valeur}</div>
            <div className="mt-0.5 text-[11px] uppercase tracking-wide text-encre-douce/70">{label}</div>
          </div>
        ))}
      </div>

      {tableau.total === 0 ? (
        <p className="text-center text-[14px] text-encre-douce">
          Aucune participation enregistrée pour l&apos;instant — inscris-toi sur un créneau depuis{' '}
          <span className="font-medium">Bénévole</span> pour commencer à remplir ce tableau.
        </p>
      ) : (
        <>
          {/* ---------- Par année ---------- */}
          {tableau.parAnnee.length > 0 && (
            <section>
              <h2 className="font-display mb-3 text-[15px]">Par année</h2>
              <div className="flex flex-col gap-2">
                {tableau.parAnnee.map((a) => (
                  <div key={a.annee} className="grid grid-cols-[50px_1fr_30px] items-center gap-3 text-[12.5px]">
                    <span className="font-score">{a.annee}</span>
                    <span className="block h-[14px] overflow-hidden rounded-full bg-sable">
                      <span
                        className="block h-full rounded-full bg-terracotta transition-[width] duration-500"
                        style={{ width: `${(a.nombre / maxAnnee) * 100}%` }}
                      />
                    </span>
                    <span className="text-right text-encre-douce">{a.nombre}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ---------- Par type de tâche ---------- */}
          <section>
            <h2 className="font-display mb-3 text-[15px]">Par type de tâche</h2>
            <div className="flex flex-col gap-2">
              {tableau.parCategorie.map((c) => (
                <div key={c.categorie} className="grid grid-cols-[110px_1fr_30px] items-center gap-3 text-[12.5px]">
                  <span className="truncate text-encre">{c.categorie}</span>
                  <span className="block h-[14px] overflow-hidden rounded-full bg-sable">
                    <span
                      className="block h-full rounded-full transition-[width] duration-500"
                      style={{
                        width: `${(c.nombre / maxCategorie) * 100}%`,
                        background: COULEURS_CATEGORIE[c.categorie] ?? '#9C9384',
                      }}
                    />
                  </span>
                  <span className="text-right text-encre-douce">{c.nombre}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ---------- À venir ---------- */}
          {tableau.aVenir.length > 0 && (
            <section>
              <h2 className="font-display mb-1 text-[15px]">À venir ({tableau.aVenir.length})</h2>
              <div className="rounded-2xl border border-ligne bg-sable-carte px-4">
                {tableau.aVenir.map((p) => (
                  <LigneParticipation key={p.affectationId} p={p} />
                ))}
              </div>
            </section>
          )}

          {/* ---------- Historique ---------- */}
          {tableau.passees.length > 0 && (
            <section>
              <h2 className="font-display mb-1 text-[15px]">Historique ({tableau.passees.length})</h2>
              <div className="rounded-2xl border border-ligne bg-sable-carte px-4">
                {tableau.passees.map((p) => (
                  <LigneParticipation key={p.affectationId} p={p} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
