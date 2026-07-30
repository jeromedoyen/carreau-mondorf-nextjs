'use client';

import { useState } from 'react';

const OPTIONS = ['Française', 'Luxembourgeoise', 'Allemande', 'Belge'];

/** Sélecteur de nationalité (29/07/2026, demande Jérôme) — liste déroulante
 *  avec les nationalités les plus fréquentes au club plutôt qu'un champ
 *  texte libre, avec une option "Autre" qui révèle un champ de précision.
 *  Un seul des deux champs porte `name="nationalite"` à la fois, pour que
 *  FormData ne récupère jamais qu'une seule valeur. */
export function ChampNationalite({ defaultValue }: { defaultValue?: string | null }) {
  const estAutre = !!defaultValue && !OPTIONS.includes(defaultValue);
  const [choix, setChoix] = useState(estAutre ? 'Autre' : defaultValue || 'Française');

  return (
    <div className="flex flex-col gap-2">
      <select
        name={choix === 'Autre' ? undefined : 'nationalite'}
        value={choix}
        onChange={(e) => setChoix(e.target.value)}
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      >
        {OPTIONS.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
        <option value="Autre">Autre…</option>
      </select>
      {choix === 'Autre' && (
        <input
          name="nationalite"
          defaultValue={estAutre ? defaultValue! : ''}
          placeholder="Préciser la nationalité"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
      )}
    </div>
  );
}
