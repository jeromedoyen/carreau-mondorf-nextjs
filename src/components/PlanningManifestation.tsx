'use client';

import { useState } from 'react';
import { Printer, FileDown } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { CATEGORIES_CRENEAU, couleurCategorie } from '@/lib/categoriesCreneau';
import { construirePlanning, HEURE_DEBUT, HEURE_FIN, HEURES } from '@/lib/planningModel';
import type { Creneau, Manifestation } from '@/lib/manifestations';
import { PlanningPdf } from './PlanningPdf';

/** Planning visuel consolidé d'une manifestation (26/07/2026, demande
 *  Jérôme — v2 après retour "pas 3 vues pour 3 jours") : UN document
 *  continu (pas un widget par jour), même esprit que le planning imprimé
 *  à la main pour le concours Vitali-Brunetta — bandes colorées par
 *  catégorie sur une grille horaire 7h→22h, personnes affectées en
 *  colonne dédiée. Vient EN COMPLÉMENT de la liste des créneaux existante
 *  (édition), pas à sa place. Le PDF téléchargeable (PlanningPdf.tsx)
 *  partage exactement le même modèle de données (planningModel.ts). */
export function PlanningManifestation({
  manifestation,
  creneaux,
}: {
  manifestation: Manifestation;
  creneaux: Creneau[];
}) {
  const [genereEnCours, setGenereEnCours] = useState(false);

  if (creneaux.length === 0) return null;

  const jours = construirePlanning(creneaux);
  const categoriesPresentes = CATEGORIES_CRENEAU.filter((cat) => creneaux.some((c) => c.categorie === cat));
  const nbHeures = HEURE_FIN - HEURE_DEBUT;

  async function telechargerPdf() {
    setGenereEnCours(true);
    try {
      const blob = await pdf(<PlanningPdf manifestation={manifestation} jours={jours} categoriesPresentes={categoriesPresentes} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Planning-${manifestation.nom.replace(/[^a-zA-Z0-9]+/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setGenereEnCours(false);
    }
  }

  return (
    <div className="planning-impression flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl italic">Planning</h2>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={telechargerPdf}
            disabled={genereEnCours}
            className="inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <FileDown size={15} />
            {genereEnCours ? 'Génération…' : 'Télécharger le PDF'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-4 py-2 text-[13px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta"
          >
            <Printer size={15} />
            Imprimer
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categoriesPresentes.map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-white"
            style={{ background: couleurCategorie(cat) }}
          >
            {cat}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-ligne bg-sable-carte">
        <div className="min-w-[900px]">
          {jours.map((jour, iJour) => (
            <div key={jour.date} className={iJour > 0 ? 'border-t border-ligne' : ''}>
              <div className="bg-marine px-4 py-2 text-[12.5px] font-semibold tracking-wide text-white">
                {jour.label}
              </div>

              <div className="grid grid-cols-[180px_140px_220px_1fr] border-b border-ligne text-[10.5px] font-medium uppercase tracking-wide text-encre-douce/60">
                <div className="px-3 py-1.5">Tâche</div>
                <div className="px-3 py-1.5">Horaire</div>
                <div className="px-3 py-1.5">Personnes</div>
                <div className="relative grid px-0" style={{ gridTemplateColumns: `repeat(${nbHeures}, 1fr)` }}>
                  {HEURES.slice(0, -1).map((h) => (
                    <div key={h} className="border-l border-ligne/70 px-1 py-1.5">
                      {h}h
                    </div>
                  ))}
                </div>
              </div>

              {jour.lignes.map((ligne) => (
                <div key={ligne.id} className="grid grid-cols-[180px_140px_220px_1fr] border-b border-ligne text-[12.5px] last:border-b-0 hover:bg-sable/60">
                  <div className="flex items-center gap-1.5 px-3 py-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: couleurCategorie(ligne.categorie) }} />
                    <span className="font-medium text-encre">{ligne.tache}</span>
                  </div>
                  <div className="flex items-center px-3 py-2 text-encre-douce">{ligne.horaireLabel}</div>
                  <div className="flex items-center px-3 py-2 text-encre-douce">{ligne.personnes}</div>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${nbHeures}, 1fr)` }}>
                      {HEURES.slice(0, -1).map((h) => (
                        <div key={h} className="border-l border-ligne/40" />
                      ))}
                    </div>
                    {ligne.segment && (
                      <div
                        className={`absolute top-1/2 h-4 -translate-y-1/2 rounded-sm ${ligne.segment.point ? 'rounded-full' : ''}`}
                        style={{
                          left: `${(ligne.segment.debut / nbHeures) * 100}%`,
                          width: `${((ligne.segment.fin - ligne.segment.debut) / nbHeures) * 100}%`,
                          background: couleurCategorie(ligne.categorie),
                          opacity: ligne.segment.imprecise ? 0.55 : 1,
                        }}
                        title={ligne.horaireLabel}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
