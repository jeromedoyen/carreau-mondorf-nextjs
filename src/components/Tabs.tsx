'use client';

import { useState, type ReactNode } from 'react';

export function Tabs({ tabs }: { tabs: { label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  return (
    <div>
      <div className="mb-5 flex gap-1.5 border-b border-[var(--ligne)]">
        {tabs.map((tab, i) => (
          <button
            key={tab.label}
            onClick={() => setActive(i)}
            className={`border-b-[3px] px-4 py-2.5 text-[13.5px] tracking-[.03em] ${
              active === i
                ? 'border-[var(--bleu)] text-[var(--encre)]'
                : 'border-transparent text-[var(--gris-txt)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs[active].content}
    </div>
  );
}
