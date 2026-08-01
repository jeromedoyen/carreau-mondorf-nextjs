'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { supprimerCreneau } from '@/lib/actions/manifestations';

/** Suppression d'un créneau/tâche (demande via /pb, note #105 : "prévoir de
 *  supprimer une tâche si on s'est trompé, c'est pas prévu"). Réservé au CA,
 *  rendu conditionnellement par la page détail. */
export function SupprimerCreneauButton({
  manifestationId,
  creneauId,
}: {
  manifestationId: number;
  creneauId: number;
}) {
  const router = useRouter();
  const [confirmer, setConfirmer] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function supprimer() {
    setEnCours(true);
    setErreur(null);
    const resultat = await supprimerCreneau(manifestationId, creneauId);
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    router.refresh();
  }

  if (confirmer) {
    return (
      <div className="flex items-center gap-1.5 text-[12px]">
        <span className="text-encre-douce">Supprimer ?</span>
        <button
          type="button"
          onClick={supprimer}
          disabled={enCours}
          className="rounded-full bg-danger px-2.5 py-1 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? '…' : 'Confirmer'}
        </button>
        <button
          type="button"
          onClick={() => setConfirmer(false)}
          className="text-encre-douce underline hover:text-encre"
        >
          Annuler
        </button>
        {erreur && <span className="text-danger">{erreur}</span>}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirmer(true)}
      aria-label="Supprimer cette tâche"
      className="text-encre-douce opacity-60 transition-opacity hover:text-danger hover:opacity-100"
    >
      <Trash2 size={14} />
    </button>
  );
}
