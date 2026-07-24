'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Users, X } from 'lucide-react';
import { ajouterAffectation, retirerAffectation } from '@/lib/actions/manifestations';
import type { Creneau } from '@/lib/manifestations';

export function CreneauAffectations({
  manifestationId,
  creneauId,
  affectations,
  postesPrevus,
}: {
  manifestationId: number;
  creneauId: number;
  affectations: Creneau['affectations'];
  postesPrevus: number;
}) {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const postesRestants = postesPrevus - affectations.length;

  async function sInscrire(e: FormEvent) {
    e.preventDefault();
    if (!nom.trim()) return;
    setErreur(null);
    setEnCours(true);
    const resultat = await ajouterAffectation(manifestationId, creneauId, nom.trim());
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setNom('');
    router.refresh();
  }

  async function seRetirer(affectationId: number) {
    await retirerAffectation(manifestationId, affectationId);
    router.refresh();
  }

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Users size={14} className="text-encre-douce" />
        {affectations.length === 0 ? (
          <span className="text-[12.5px] text-encre-douce">Aucun bénévole inscrit</span>
        ) : (
          affectations.map((a) => (
            <span
              key={a.id}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-medium ${
                a.estMembre ? 'bg-pin/10 text-pin' : 'bg-sable text-encre-douce'
              }`}
            >
              {a.nom}
              <button
                type="button"
                onClick={() => seRetirer(a.id)}
                aria-label={`Retirer ${a.nom}`}
                className="text-current opacity-60 hover:opacity-100"
              >
                <X size={11} />
              </button>
            </span>
          ))
        )}
        <span className={`ml-auto text-[12px] font-medium ${postesRestants > 0 ? 'text-terracotta' : 'text-succes'}`}>
          {postesRestants > 0 ? `${postesRestants} poste(s) à pourvoir` : 'Complet'}
        </span>
      </div>

      <form onSubmit={sInscrire} className="mt-2.5 flex gap-2">
        <input
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="S'inscrire (prénom nom)"
          className="flex-1 rounded-lg border border-ligne bg-sable px-3 py-1.5 text-[13px] outline-none focus:border-terracotta"
        />
        <button
          type="submit"
          disabled={enCours || !nom.trim()}
          className="rounded-lg bg-pin px-3.5 py-1.5 text-[12.5px] font-medium text-sable-carte transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? '…' : "S'inscrire"}
        </button>
      </form>
      {erreur && <p className="mt-1.5 text-[12px] text-danger">{erreur}</p>}
    </div>
  );
}
