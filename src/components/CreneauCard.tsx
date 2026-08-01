'use client';

import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { couleurCategorie } from '@/lib/categoriesCreneau';
import { ModifierCreneauForm } from './ModifierCreneauForm';
import { SupprimerCreneauButton } from './SupprimerCreneauButton';
import { CreneauAffectations } from './CreneauAffectations';
import type { Creneau } from '@/lib/manifestations';

/** Carte d'un créneau/tâche — bascule entre affichage et édition (nom,
 *  catégorie, date, horaires) sans perturber le reste de la carte
 *  (affectations toujours visibles). Réservé au CA pour l'édition/suppression,
 *  ouvert à tout licencié pour les affectations (CreneauAffectations). */
export function CreneauCard({
  manifestationId,
  creneau,
  ca,
  nomsMembres,
}: {
  manifestationId: number;
  creneau: Creneau;
  ca: boolean;
  nomsMembres: string[];
}) {
  const [edition, setEdition] = useState(false);
  const c = creneau;

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      {edition ? (
        <ModifierCreneauForm
          manifestationId={manifestationId}
          id={c.id}
          tache={c.tache}
          categorie={c.categorie}
          date={c.date}
          heureDebut={c.heureDebut}
          heureFin={c.heureFin}
          postesPrevus={c.postesPrevus}
          onFerme={() => setEdition(false)}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-display text-[15px]">{c.tache}</span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium text-white"
              style={{ background: couleurCategorie(c.categorie) }}
            >
              {c.categorie}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12.5px] text-encre-douce">
              {new Date(c.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              {c.heureDebut && ` · ${c.heureDebut}${c.heureFin ? `–${c.heureFin}` : c.finImprecise ? '…' : ''}`}
            </span>
            {ca && (
              <button
                type="button"
                onClick={() => setEdition(true)}
                aria-label="Modifier cette tâche"
                className="text-encre-douce opacity-60 transition-opacity hover:text-terracotta hover:opacity-100"
              >
                <Pencil size={14} />
              </button>
            )}
            {ca && <SupprimerCreneauButton manifestationId={manifestationId} creneauId={c.id} />}
          </div>
        </div>
      )}

      <CreneauAffectations
        manifestationId={manifestationId}
        creneauId={c.id}
        affectations={c.affectations}
        postesPrevus={c.postesPrevus}
        nomsMembres={nomsMembres}
      />
    </div>
  );
}
