'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { envoyerRelancesRenouvellement } from '@/lib/actions/renouvellement';

export function LancerRenouvellementBouton({ annee, nombre }: { annee: string; nombre: number }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<{ envoyes: number; echecs: string[] } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function lancer() {
    if (!window.confirm(`Envoyer la relance de renouvellement ${annee} à ${nombre} membre${nombre > 1 ? 's' : ''} ?`)) return;
    setErreur(null);
    setResultat(null);
    setEnCours(true);
    const r = await envoyerRelancesRenouvellement(annee);
    setEnCours(false);
    if (!r.ok) {
      setErreur(r.error);
      return;
    }
    setResultat({ envoyes: r.envoyes, echecs: r.echecs });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={lancer}
        disabled={enCours || nombre === 0}
        className="inline-flex items-center gap-2 self-start rounded-lg bg-terracotta px-4 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <Send size={15} />
        {enCours ? 'Envoi en cours…' : `Lancer le renouvellement ${annee}`}
      </button>
      {erreur && <p className="text-[13px] text-danger">{erreur}</p>}
      {resultat && (
        <p className="text-[13px] text-encre-douce">
          {resultat.envoyes} email{resultat.envoyes > 1 ? 's' : ''} envoyé{resultat.envoyes > 1 ? 's' : ''}.
          {resultat.echecs.length > 0 && ` Échec pour : ${resultat.echecs.join(', ')}.`}
        </p>
      )}
    </div>
  );
}
