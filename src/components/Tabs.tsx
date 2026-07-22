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
      <div className="mb-5 flex gap-1.5 border-b border-[var(--ligne)]">
        {labels.map((label, i) => (
          <button
            key={label}
            onClick={() => setActive(i)}
            className={`border-b-[3px] px-4 py-2.5 text-[13.5px] tracking-[.03em] ${
              active === i
                ? 'border-[var(--bleu)] text-[var(--encre)]'
                : 'border-transparent text-[var(--gris-txt)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {children[active]}
    </div>
  );
}
