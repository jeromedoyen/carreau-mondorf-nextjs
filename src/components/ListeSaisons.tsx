'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { activerSaison } from '@/lib/actions/saisons';
import type { Saison } from '@/lib/saisons';

export function ListeSaisons({ saisons }: { saisons: Saison[] }) {
  const router = useRouter();
  const [enCoursId, setEnCoursId] = useState<number | null>(null);

  async function activer(id: number, libelle: string) {
    if (!window.confirm(`Rendre la saison ${libelle} active ? Elle deviendra la saison affichée par défaut partout sur le site.`)) return;
    setEnCoursId(id);
    await activerSaison(id);
    setEnCoursId(null);
    router.refresh();
  }

  return (
    <div className="divide-y divide-ligne overflow-hidden rounded-2xl border border-ligne bg-sable-carte">
      {saisons.map((s) => (
        <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="font-display text-[16px]">{s.libelle}</span>
            {s.active && (
              <span className="rounded-full bg-pin/15 px-2.5 py-0.5 text-[11px] font-medium text-pin">Active</span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[13px] text-encre-douce">
              {new Date(s.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' – '}
              {new Date(s.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            {!s.active && (
              <button
                type="button"
                onClick={() => activer(s.id, s.libelle)}
                disabled={enCoursId === s.id}
                className="rounded-full border border-ligne px-3 py-1.5 text-[12.5px] font-medium text-encre transition-colors hover:border-terracotta disabled:opacity-50"
              >
                {enCoursId === s.id ? '…' : 'Activer'}
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
