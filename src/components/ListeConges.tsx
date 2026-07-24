'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { supprimerConge } from '@/lib/actions/conges';
import type { Conge } from '@/lib/conges';

function formatPeriode(dateDebut: string, dateFin: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const debut = new Date(dateDebut).toLocaleDateString('fr-FR', opts);
  if (dateDebut === dateFin) return debut;
  const fin = new Date(dateFin).toLocaleDateString('fr-FR', { ...opts, year: 'numeric' });
  return `${debut} – ${fin}`;
}

export function ListeConges({ conges }: { conges: Conge[] }) {
  const router = useRouter();

  async function supprimer(id: number) {
    await supprimerConge(id);
    router.refresh();
  }

  if (conges.length === 0) {
    return <p className="text-[14px] text-encre-douce">Aucun congé déclaré pour cette saison.</p>;
  }

  return (
    <div className="divide-y divide-ligne overflow-hidden rounded-2xl border border-ligne bg-sable-carte">
      {conges.map((c) => (
        <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <span className="font-display text-[14.5px]">{c.personne}</span>
            {c.motif && <span className="ml-2 text-[12.5px] text-encre-douce">{c.motif}</span>}
            {c.note && <p className="mt-0.5 text-[12px] text-encre-douce">{c.note}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-encre-douce">{formatPeriode(c.dateDebut, c.dateFin)}</span>
            <button
              type="button"
              onClick={() => supprimer(c.id)}
              aria-label={`Supprimer le congé de ${c.personne}`}
              className="text-encre-douce/60 hover:text-danger"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
