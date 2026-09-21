'use client';

import { useState, type ReactElement } from 'react';

export function Tabs({
  labels,
  children,
}: {
  labels: string[];
  children: ReactElement[];
}) {
  const [active, setActive] = useState(0);
  return (
    <div>
      {/* Défilement horizontal plutôt que retour à la ligne : au-delà de
          trois onglets, les libellés se coupaient en deux sur un téléphone
          (constaté à 375 px avec les quatre onglets de /moncaro). Les
          onglets gardent donc leur nom entier, et la barre glisse.
          `scrollbar-width: none` laisse le geste sans afficher de barre. */}
      <div
        role="tablist"
        className="mb-6 flex gap-2 overflow-x-auto border-b border-ligne [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {labels.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={`font-display shrink-0 whitespace-nowrap px-4 py-2.5 text-[14.5px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-terracotta ${
              active === i
                ? 'border-b-2 border-terracotta text-encre'
                : 'border-b-2 border-transparent text-encre-douce hover:text-terracotta'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div key={active} className="entree">
        {children[active]}
      </div>
    </div>
  );
}
