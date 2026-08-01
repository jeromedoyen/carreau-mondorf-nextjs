'use client';

import { useState } from 'react';
import { VueRencontreD2 } from './VueRencontreD2';
import { FeuilleDeMatch } from './FeuilleDeMatch';
import { ForfaitPanel } from './ForfaitPanel';
import type { RencontreDetail } from '@/lib/rencontreDetail';

/** Pour le CA : consultation par défaut (structure des parties + points +
 *  récap de la journée) plutôt que d'atterrir directement dans le
 *  formulaire de saisie — "cliquer sur une ligne ne doit pas seulement
 *  servir à modifier, mais aussi à visualiser" (retour Jérôme via /pb,
 *  01/08/2026). Un bouton bascule vers l'édition (FeuilleDeMatch). Une
 *  rencontre pas encore jouée n'a rien à consulter : on démarre directement
 *  en édition dans ce cas. */
export function RencontreCAPanel({ rencontre }: { rencontre: RencontreDetail }) {
  const dejaJouee =
    rencontre.statut === 'Jouée' || rencontre.statut === 'ForfaitCM' || rencontre.statut === 'ForfaitAdverse';
  const [mode, setMode] = useState<'vue' | 'edition'>(dejaJouee ? 'vue' : 'edition');

  if (mode === 'vue') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMode('edition')}
            className="font-display rounded-lg border border-ligne px-4 py-2 text-[13px] text-encre-douce transition-colors hover:text-encre"
          >
            Modifier le résultat
          </button>
        </div>
        <VueRencontreD2 parties={rencontre.parties} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {dejaJouee && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setMode('vue')}
            className="rounded-lg border border-ligne px-4 py-2 text-[13px] text-encre-douce transition-colors hover:text-encre"
          >
            Retour à la consultation
          </button>
        </div>
      )}
      {rencontre.statut !== 'Jouée' && (
        <ForfaitPanel rencontreId={rencontre.id} adversaire={rencontre.adversaire ?? 'l’adversaire'} />
      )}
      <FeuilleDeMatch rencontre={rencontre} />
    </div>
  );
}
