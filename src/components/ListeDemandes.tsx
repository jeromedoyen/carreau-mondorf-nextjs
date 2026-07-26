'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { refuserDemande } from '@/lib/actions/demandes';
import type { Demande } from '@/lib/demandes';

export function ListeDemandes({ demandes }: { demandes: Demande[] }) {
  const router = useRouter();

  async function refuser(id: number, nomComplet: string) {
    if (!window.confirm(`Refuser la demande de ${nomComplet} ?`)) return;
    await refuserDemande(id);
    router.refresh();
  }

  if (!demandes.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucune demande en attente.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {demandes.map((d) => (
        <div
          key={d.id}
          className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)] sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[15px]">
                {d.prenom} {d.nom}
              </span>
              <span className="rounded-full bg-marine/15 px-2.5 py-0.5 text-[11px] font-medium text-marine">
                {d.typeDemande}
              </span>
              {d.typeAdhesionSouhaite && (
                <span className="rounded-full bg-pin/15 px-2.5 py-0.5 text-[11px] font-medium text-pin">
                  {d.typeAdhesionSouhaite}
                </span>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-encre-douce">
              {d.email} · {d.telephone}
            </p>
            {d.message && <p className="mt-1 text-[12.5px] italic text-encre-douce">« {d.message} »</p>}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={`/membres/nouveau?demandeId=${d.id}`}
              className="rounded-full bg-terracotta px-4 py-2 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90"
            >
              Traiter
            </Link>
            <button
              type="button"
              onClick={() => refuser(d.id, `${d.prenom} ${d.nom}`)}
              aria-label={`Refuser la demande de ${d.prenom} ${d.nom}`}
              className="text-encre-douce/60 hover:text-danger"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
