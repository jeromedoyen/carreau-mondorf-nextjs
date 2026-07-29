import { Check, X } from 'lucide-react';
import type { Demande } from '@/lib/demandes';

const LABEL_STATUT: Record<string, string> = { validee: 'Validée', rejetee: 'Refusée' };

/** Liste read-only des dernières demandes traitées (29/07/2026, retour
 *  Jérôme) — pas d'action possible ici, juste une trace visible pour
 *  confirmer qu'un traitement a bien eu lieu. */
export function ListeDemandesTraitees({ demandes }: { demandes: Demande[] }) {
  if (!demandes.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucune demande traitée récemment.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {demandes.map((d) => {
        const validee = d.statut === 'validee';
        return (
          <div
            key={d.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-ligne bg-sable-carte px-4 py-2.5"
          >
            <div className="min-w-0">
              <span className="text-[13px] font-medium text-encre">
                {d.prenom} {d.nom}
              </span>
              <span className="ml-2 text-[11.5px] text-encre-douce">{d.typeDemande}</span>
            </div>
            <span
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                validee ? 'bg-pin/15 text-pin' : 'bg-danger/10 text-danger'
              }`}
            >
              {validee ? <Check size={12} /> : <X size={12} />}
              {LABEL_STATUT[d.statut] ?? d.statut}
            </span>
          </div>
        );
      })}
    </div>
  );
}
