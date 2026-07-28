'use client';

import { useState } from 'react';
import type { RencontreDetail } from '@/lib/rencontreDetail';
import type { PartieSaisie } from '@/lib/actions/matchSheet';
import { ForfaitPanel } from './ForfaitPanel';
import { ImportResultatsPdf } from './ImportResultatsPdf';
import { FeuilleDeMatch } from './FeuilleDeMatch';

/** Regroupe forfait, import PDF et feuille de match pour partager l'état
 *  des lignes importées entre l'import et le formulaire (28/07/2026,
 *  demande Jérôme). */
export function SaisieRencontre({ rencontre }: { rencontre: RencontreDetail }) {
  const [importation, setImportation] = useState<PartieSaisie[] | null>(null);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <ForfaitPanel rencontreId={rencontre.id} adversaire={rencontre.adversaire ?? 'l’adversaire'} />
        <ImportResultatsPdf
          domicile={rencontre.domicile ?? true}
          adversaire={rencontre.adversaire ?? 'l’adversaire'}
          onImporter={setImportation}
        />
      </div>
      <FeuilleDeMatch
        rencontre={rencontre}
        importation={importation}
        onImportationConsommee={() => setImportation(null)}
      />
    </div>
  );
}
