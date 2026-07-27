'use client';

import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { EntreeJournal } from '@/lib/journal';

const ACTION_COULEUR: Record<string, string> = {
  creation: 'bg-succes/15 text-succes',
  modification: 'bg-marine/15 text-marine',
  suppression: 'bg-danger/15 text-danger',
};
const ACTION_LABEL: Record<string, string> = {
  creation: 'Création',
  modification: 'Modification',
  suppression: 'Suppression',
};

export function ListeJournal({ entrees }: { entrees: EntreeJournal[] }) {
  const [tableFiltre, setTableFiltre] = useState('');
  const [ouvert, setOuvert] = useState<number | null>(null);

  const tables = useMemo(
    () => Array.from(new Set(entrees.map((e) => e.tableCible))).sort(),
    [entrees]
  );
  const filtrees = tableFiltre ? entrees.filter((e) => e.tableCible === tableFiltre) : entrees;

  if (entrees.length === 0) {
    return <p className="text-[14px] text-encre-douce">Aucune action enregistrée pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <select
        value={tableFiltre}
        onChange={(e) => setTableFiltre(e.target.value)}
        className="self-start rounded-lg border border-ligne bg-sable px-3 py-2 text-[13px] outline-none focus:border-terracotta"
      >
        <option value="">Toutes les tables</option>
        {tables.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </select>

      <div className="flex flex-col gap-2">
        {filtrees.map((e) => (
          <div key={e.id} className="rounded-2xl border border-ligne bg-sable-carte">
            <button
              type="button"
              onClick={() => setOuvert(ouvert === e.id ? null : e.id)}
              className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ACTION_COULEUR[e.action]}`}>
                  {ACTION_LABEL[e.action]}
                </span>
                <span className="text-[13.5px] text-encre">
                  {e.tableCible} <span className="text-encre-douce">#{e.ligneId}</span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[12.5px] text-encre-douce">
                <span>{e.auteurEmail}</span>
                <span>{new Date(e.creeLe).toLocaleString('fr-FR')}</span>
                <ChevronDown size={15} className={`transition-transform ${ouvert === e.id ? 'rotate-180' : ''}`} />
              </div>
            </button>
            {ouvert === e.id && (
              <div className="grid grid-cols-1 gap-3 border-t border-ligne p-4 sm:grid-cols-2">
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-encre-douce/70">Avant</p>
                  <pre className="overflow-x-auto rounded-lg bg-sable p-3 text-[11.5px] text-encre-douce">
                    {JSON.stringify(e.avant, null, 2) ?? '—'}
                  </pre>
                </div>
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-encre-douce/70">Après</p>
                  <pre className="overflow-x-auto rounded-lg bg-sable p-3 text-[11.5px] text-encre-douce">
                    {JSON.stringify(e.apres, null, 2) ?? '—'}
                  </pre>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
