'use client';

import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { supprimerEvenementFederation } from '@/lib/actions/federation';
import type { EvenementFederationAdmin } from '@/lib/data';

export function ListeEvenementsFederation({ evenements }: { evenements: EvenementFederationAdmin[] }) {
  const router = useRouter();

  async function supprimer(id: number) {
    await supprimerEvenementFederation(id);
    router.refresh();
  }

  if (evenements.length === 0) {
    return <p className="text-[14px] text-encre-douce">Aucun événement pour cette saison.</p>;
  }

  return (
    <div className="divide-y divide-ligne overflow-hidden rounded-2xl border border-ligne bg-sable-carte">
      {evenements.map((e) => (
        <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[14.5px]">{e.libelle}</span>
              <span className="rounded-full bg-marine/15 px-2.5 py-0.5 text-[11px] font-medium text-marine">
                {e.categorie}
              </span>
              {e.concerneClub && (
                <span className="rounded-full bg-pin/15 px-2.5 py-0.5 text-[11px] font-medium text-pin">
                  Club
                </span>
              )}
            </div>
            {e.lieu && <p className="mt-0.5 text-[12.5px] text-encre-douce">{e.lieu}</p>}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[13px] text-encre-douce">
              {new Date(e.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={() => supprimer(e.id)}
              aria-label={`Supprimer ${e.libelle}`}
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
