'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import { declarerForfaitRencontre } from '@/lib/actions/matchSheet';

type Choix = 'CM' | 'Adverse' | null;

/** Action rapide alternative à la saisie détaillée (FeuilleDeMatch) —
 *  règlement FLBP : le vainqueur d'un forfait remporte 32-0. Confirmation
 *  en deux temps (pas de window.confirm — cohérent avec le reste de
 *  l'interface, jamais de popup navigateur dans ce prototype). */
export function ForfaitPanel({ rencontreId, adversaire }: { rencontreId: number; adversaire: string }) {
  const router = useRouter();
  const [choix, setChoix] = useState<Choix>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer() {
    if (!choix) return;
    setEnCours(true);
    setErreur(null);
    const resultat = await declarerForfaitRencontre(rencontreId, choix);
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    router.push('/national-d2');
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-danger/30 bg-danger/5 p-6">
      <div className="mb-3 flex items-center gap-2 text-danger">
        <AlertTriangle size={17} />
        <h3 className="font-display m-0 text-lg text-encre">Déclarer un forfait</h3>
      </div>
      <p className="mb-4 text-[13px] text-encre-douce">
        Le club vainqueur d&apos;un forfait remporte la rencontre 32 à 0
        (règlement FLBP). À utiliser à la place de la feuille de match
        détaillée ci-dessous, pas en complément.
      </p>

      {choix ? (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-sable-carte p-3.5">
          <p className="text-[13px] text-encre">
            Confirmer le forfait de{' '}
            <strong>{choix === 'CM' ? 'Carreau Mondorf' : adversaire}</strong> — score final 32-0
            en faveur de {choix === 'CM' ? adversaire : 'Carreau Mondorf'} ?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={confirmer}
              disabled={enCours}
              className="font-display rounded-lg bg-danger px-3.5 py-1.5 text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {enCours ? 'Enregistrement…' : 'Confirmer'}
            </button>
            <button
              type="button"
              onClick={() => setChoix(null)}
              disabled={enCours}
              className="rounded-lg border border-ligne px-3.5 py-1.5 text-[13px] text-encre-douce hover:text-encre"
            >
              Annuler
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            onClick={() => setChoix('CM')}
            className="rounded-lg border border-danger/40 px-3.5 py-2 text-[13px] text-danger transition-colors hover:bg-danger/10"
          >
            Forfait Carreau Mondorf
          </button>
          <button
            type="button"
            onClick={() => setChoix('Adverse')}
            className="rounded-lg border border-danger/40 px-3.5 py-2 text-[13px] text-danger transition-colors hover:bg-danger/10"
          >
            Forfait {adversaire}
          </button>
        </div>
      )}

      {erreur && <p className="mt-3 text-[12.5px] text-danger">{erreur}</p>}
    </div>
  );
}
