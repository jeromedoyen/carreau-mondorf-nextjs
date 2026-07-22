'use client';

import { useState } from 'react';
import type { ClassementDivisionD2 } from '@/lib/types';
import { ClassementChart } from './ClassementChart';
import { ClassementBars } from './ClassementBars';
import { CLUB_CARREAU_MONDORF } from '@/lib/types';

export function ClassementView({ data }: { data: ClassementDivisionD2 }) {
  const derniereJournee = data.journees[data.journees.length - 1] ?? 1;
  const [journee, setJournee] = useState(derniereJournee);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--ligne)] bg-[var(--carte)] p-5 shadow-[0_1px_3px_rgba(26,26,23,.04),0_1px_2px_rgba(26,26,23,.03)]">
        <h3 className="m-0 mb-1 text-base">
          Situation à l&apos;issue de la journée {journee}
        </h3>
        <p className="m-0 mb-2.5 text-[12.5px] text-[var(--gris-txt)]">
          Résultats officiels FLBP, poule National D2 complète (pas seulement Carreau Mondorf).
        </p>
        <ClassementChart data={data} onJourneeChange={setJournee} />
        <div className="mt-2.5 flex flex-wrap gap-4 text-[11.5px] text-[var(--gris-txt)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3.5 rounded-sm bg-[var(--bleu)]" />
            {CLUB_CARREAU_MONDORF}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-[3px] w-3.5 rounded-sm bg-[var(--gris-clair)]" />
            Les 6 autres clubs
          </span>
        </div>
        <p className="m-0 mt-2 text-center text-[11.5px] text-[var(--gris-clair)]">
          Survolez ou touchez le graphique pour explorer une journée
        </p>
      </div>
      <div className="rounded-2xl border border-[var(--ligne)] bg-[var(--carte)] p-5 shadow-[0_1px_3px_rgba(26,26,23,.04),0_1px_2px_rgba(26,26,23,.03)]">
        <h3 className="m-0 mb-3 text-base">Classement à cette journée</h3>
        <ClassementBars data={data} journee={journee} />
      </div>
    </div>
  );
}
