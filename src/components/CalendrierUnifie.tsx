'use client';

import { useMemo, useState } from 'react';
import { Home, Plane, MapPin, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ItemCalendrier } from '@/lib/data';

const COULEUR_CATEGORIE: Record<string, string> = {
  'National D2': 'var(--terracotta)',
  Promotion: 'var(--pin)',
  Tournoi: 'var(--laiton)',
  'Coupe de Luxembourg': 'var(--marine)',
  'Championnat national': 'var(--marine-clair)',
  // Types de manifestations internes (NouvelleManifestationForm.tsx) —
  // ajoutés le 26/07/2026 pour que le calendrier unifié les distingue des
  // rencontres/événements fédération plutôt que de tout regrouper sous une
  // seule couleur générique "Manifestation club".
  'Concours international': 'var(--terracotta-dark)',
  'Tournoi interne': 'var(--laiton)',
  Festif: 'var(--succes)',
  Championnat: 'var(--marine-clair)',
  'Manifestation club': 'var(--encre-douce)',
  'Congé CA': 'var(--danger)',
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

const JOURS_SEMAINE = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];

/** Grille mensuelle (28/07/2026, retour Jérôme en session : "j'ai besoin de
 *  voir un calendrier... mais avoir aussi le calendrier qui s'adapte au
 *  filtre qu'on a appliqué") — construite à partir du même `filtres` que la
 *  liste chronologique juste en dessous, jamais recalculée séparément. */
function construireGrilleMois(anneeMois: string, items: ItemCalendrier[]) {
  const [annee, mois] = anneeMois.split('-').map(Number);
  const premierDuMois = new Date(annee, mois - 1, 1);
  // Lundi = 0 (convention FR) plutôt que dimanche = 0 (JS natif).
  const decalage = (premierDuMois.getDay() + 6) % 7;
  const debutGrille = new Date(annee, mois - 1, 1 - decalage);

  const parJour = new Map<string, ItemCalendrier[]>();
  items.forEach((i) => {
    if (!parJour.has(i.date)) parJour.set(i.date, []);
    parJour.get(i.date)!.push(i);
  });

  return Array.from({ length: 42 }, (_, idx) => {
    const jour = new Date(debutGrille);
    jour.setDate(debutGrille.getDate() + idx);
    const iso = jour.toISOString().slice(0, 10);
    return {
      iso,
      numero: jour.getDate(),
      horsMois: jour.getMonth() !== mois - 1,
      evenements: parJour.get(iso) ?? [],
    };
  });
}

/** Filtre par catégorie + calendrier en grille + liste chronologique
 *  groupée par mois — pas de survol requis pour lire une info (principe
 *  déjà appliqué au graphique de classement, cf. ClassementBars.tsx). */
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

  const reinitialiserFiltres = () => setActives(new Set(categories));
  const filtresActifs = actives.size !== categories.length;

  const filtres = items.filter((i) => actives.has(i.categorie));

  const aujourdhui = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const moisCourant = aujourdhui.slice(0, 7); // yyyy-mm
  const [moisAffiche, setMoisAffiche] = useState(moisCourant);

  const grille = useMemo(() => construireGrilleMois(moisAffiche, filtres), [moisAffiche, filtres]);
  const [jourSelectionne, setJourSelectionne] = useState<string | null>(null);
  const jourDetail = grille.find((j) => j.iso === jourSelectionne);

  function changerMois(delta: number) {
    const [a, m] = moisAffiche.split('-').map(Number);
    const d = new Date(a, m - 1 + delta, 1);
    setMoisAffiche(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    setJourSelectionne(null);
  }

  const groupes = useMemo(() => {
    const map = new Map<string, ItemCalendrier[]>();
    filtres.forEach((i) => {
      const cle = i.date.slice(0, 7); // yyyy-mm
      if (!map.has(cle)) map.set(cle, []);
      map.get(cle)!.push(i);
    });
    // Réordonne du mois en cours à décembre, puis janvier au mois précédent
    // le mois en cours — plutôt que janvier -> décembre chronologique brut,
    // pour que la saison en cours démarre en haut de page.
    return Array.from(map.entries()).sort(([a], [b]) => {
      const rang = (cle: string) => (cle >= moisCourant ? cle : `9${cle}`);
      return rang(a).localeCompare(rang(b));
    });
  }, [filtres, moisCourant]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-1.5">
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
        {filtresActifs && (
          <button
            onClick={reinitialiserFiltres}
            className="ml-1 flex items-center gap-1.5 rounded-full border border-ligne px-3 py-1 text-[12px] text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta"
          >
            <RotateCcw size={12} />
            Réinitialiser les filtres
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-ligne bg-sable-carte p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-lg italic text-encre">{formatMois(`${moisAffiche}-01`)}</h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => changerMois(-1)}
              aria-label="Mois précédent"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-encre-douce hover:bg-sable"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => {
                setMoisAffiche(moisCourant);
                setJourSelectionne(null);
              }}
              className="rounded-lg px-2 py-1 text-[11.5px] text-encre-douce hover:bg-sable"
            >
              Aujourd&apos;hui
            </button>
            <button
              onClick={() => changerMois(1)}
              aria-label="Mois suivant"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-encre-douce hover:bg-sable"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {JOURS_SEMAINE.map((j) => (
            <div key={j} className="pb-1 text-center text-[10.5px] font-medium uppercase tracking-wide text-encre-douce/70">
              {j}
            </div>
          ))}
          {grille.map((jour) => {
            // Jours passés : le numéro reste visible (contexte de la grille),
            // mais pas les pastilles d'événement — retour Jérôme (enregistrement
            // audio, 28/07/2026) : "ne fait pas apparaître les événements qui
            // sont déjà passés" dans le calendrier.
            const passe = jour.iso < aujourdhui;
            const cliquable = jour.evenements.length > 0 && !passe;
            return (
              <button
                key={jour.iso}
                type="button"
                onClick={() => cliquable && setJourSelectionne((prev) => (prev === jour.iso ? null : jour.iso))}
                disabled={!cliquable}
                className={`flex min-h-[52px] flex-col items-center gap-1 rounded-lg py-1.5 text-[12px] transition-colors ${
                  jour.horsMois ? 'text-encre-douce/30' : passe ? 'text-encre-douce/50' : 'text-encre'
                } ${jour.iso === aujourdhui ? 'bg-terracotta/10 font-semibold text-terracotta' : ''} ${
                  jourSelectionne === jour.iso ? 'ring-1 ring-terracotta' : ''
                } ${cliquable ? 'cursor-pointer hover:bg-sable' : 'cursor-default'}`}
              >
                {jour.numero}
                {!passe && jour.evenements.length > 0 && (
                  <div className="flex flex-wrap items-center justify-center gap-[3px]">
                    {jour.evenements.slice(0, 3).map((e, i) => (
                      <span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: couleurCategorie(e.categorie) }}
                      />
                    ))}
                    {jour.evenements.length > 3 && (
                      <span className="text-[9px] text-encre-douce">+{jour.evenements.length - 3}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {jourDetail && jourDetail.evenements.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5 rounded-xl border border-ligne bg-sable px-3 py-2.5">
            <span className="text-[11px] font-medium text-encre-douce">
              {new Date(jourDetail.iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            {jourDetail.evenements.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-[12.5px]">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: couleurCategorie(e.categorie) }} />
                <span className="font-medium text-encre">{e.titre}</span>
                <span className="text-encre-douce">— {e.categorie}</span>
              </div>
            ))}
          </div>
        )}
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
                {evenements.map((e, i) => {
                  const passe = e.date < aujourdhui;
                  return (
                  <div
                    key={`${e.date}-${e.titre}-${i}`}
                    className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-t border-ligne px-5 py-3 text-[13.5px] first:border-t-0 hover:bg-sable/60 ${
                      passe ? 'opacity-45' : ''
                    }`}
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
