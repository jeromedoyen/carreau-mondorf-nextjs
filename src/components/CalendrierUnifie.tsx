'use client';

import { useMemo, useState } from 'react';
import { Home, Plane, MapPin } from 'lucide-react';
import type { ItemCalendrier } from '@/lib/data';

const COULEUR_CATEGORIE: Record<string, string> = {
  'National D2': 'var(--terracotta)',
  Promotion: 'var(--pin)',
  Tournoi: 'var(--laiton)',
  'Coupe de Luxembourg': 'var(--marine)',
  'Championnat national': 'var(--marine-clair)',
};

function couleurCategorie(categorie: string) {
  return COULEUR_CATEGORIE[categorie] ?? 'var(--encre-douce)';
}

function formatDate(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function formatMois(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  const label = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Filtre par catégorie + liste chronologique groupée par mois — pas de
 *  survol requis pour lire une info (principe déjà appliqué au graphique de
 *  classement, cf. ClassementBars.tsx). */
export function CalendrierUnifie({ items }: { items: ItemCalendrier[] }) {
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.categorie))),
    [items]
  );
  const [actives, setActives] = useState<Set<string>>(new Set(categories));

  const toggle = (cat: string) => {
    setActives((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtres = items.filter((i) => actives.has(i.categorie));

  const groupes = useMemo(() => {
    const map = new Map<string, ItemCalendrier[]>();
    filtres.forEach((i) => {
      const cle = i.date.slice(0, 7); // yyyy-mm
      if (!map.has(cle)) map.set(cle, []);
      map.get(cle)!.push(i);
    });
    return Array.from(map.entries());
  }, [filtres]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => {
          const active = actives.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggle(cat)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] transition-colors ${
                active
                  ? 'border-transparent text-white'
                  : 'border-ligne bg-transparent text-encre-douce/60'
              }`}
              style={active ? { background: couleurCategorie(cat) } : undefined}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: active ? 'white' : couleurCategorie(cat) }}
              />
              {cat}
            </button>
          );
        })}
      </div>

      {groupes.length === 0 ? (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
          Aucun événement pour les catégories sélectionnées.
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {groupes.map(([mois, evenements]) => (
            <div key={mois}>
              <h3 className="font-display mb-3 text-lg italic text-encre-douce">
                {formatMois(evenements[0].date)}
              </h3>
              <div className="rounded-2xl border border-ligne bg-sable-carte shadow-[0_1px_3px_rgba(36,27,18,.04)]">
                {evenements.map((e, i) => (
                  <div
                    key={`${e.date}-${e.titre}-${i}`}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-ligne px-5 py-3 text-[13.5px] first:border-t-0 hover:bg-sable/60"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-score w-9 shrink-0 text-encre-douce/70">
                        {formatDate(e.date)}
                      </span>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: couleurCategorie(e.categorie) }}
                      />
                      <span className="font-medium text-encre">{e.titre}</span>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 text-[12px] text-encre-douce">
                      {e.lieu && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {e.lieu}
                        </span>
                      )}
                      {e.domicile !== null &&
                        (e.domicile ? (
                          <Home size={14} className="text-pin" />
                        ) : (
                          <Plane size={14} className="text-encre-douce/50" />
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
