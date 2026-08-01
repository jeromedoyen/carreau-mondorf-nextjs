'use client';

import { useState, type ReactNode } from 'react';

/** Bascule Calendrier/Statistiques sur la même page, plutôt que l'empilement
 *  vertical qui obligeait à défiler jusqu'en bas pour voir les stats
 *  (retour Jérôme via /pb, 01/08/2026 : "un bouton à cliquer pour passer sur
 *  la partie statistique"). Les deux blocs sont fournis déjà rendus par la
 *  page (Server Component) — ce composant se contente d'en afficher un seul
 *  à la fois. */
export function SectionToggle({ calendrier, statistiques }: { calendrier: ReactNode; statistiques: ReactNode }) {
  const [vue, setVue] = useState<'calendrier' | 'statistiques'>('calendrier');

  return (
    <div>
      <div className="mb-6 flex gap-1.5">
        <button
          type="button"
          onClick={() => setVue('calendrier')}
          className={`font-display rounded-full px-4 py-1.5 text-[13px] transition-colors ${
            vue === 'calendrier' ? 'bg-terracotta text-white' : 'bg-sable text-encre-douce hover:text-encre'
          }`}
        >
          Calendrier &amp; classement
        </button>
        <button
          type="button"
          onClick={() => setVue('statistiques')}
          className={`font-display rounded-full px-4 py-1.5 text-[13px] transition-colors ${
            vue === 'statistiques' ? 'bg-terracotta text-white' : 'bg-sable text-encre-douce hover:text-encre'
          }`}
        >
          Statistiques individuelles
        </button>
      </div>
      {vue === 'calendrier' ? calendrier : statistiques}
    </div>
  );
}
