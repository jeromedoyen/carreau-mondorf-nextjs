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
      <div className="mb-6 flex gap-2 border-b border-ligne">
        {labels.map((label, i) => (
          <button
            key={label}
            onClick={() => setActive(i)}
            className={`font-display px-4 py-2.5 text-[14.5px] transition-colors ${
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
