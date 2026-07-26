'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MessageSquareText, Pencil, Trash2 } from 'lucide-react';
import { supprimerMembre } from '@/lib/actions/membres';
import type { PersonneAvecAdhesion } from '@/lib/types';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Passé en Client Component (édition/suppression, Phase E) — la RLS
 *  ("lecture CA uniquement") continue de protéger les données, ce
 *  composant ne fait qu'afficher ce que le serveur lui a déjà transmis. */
export function RegistreMembres({ personnes }: { personnes: PersonneAvecAdhesion[] }) {
  const router = useRouter();

  async function supprimer(id: number, nomComplet: string) {
    if (!window.confirm(`Retirer ${nomComplet} du registre ?`)) return;
    await supprimerMembre(id);
    router.refresh();
  }

  if (!personnes.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucun membre trouvé pour cette année (ou aucune donnée encore importée).
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-ligne bg-sable-carte shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-ligne text-left text-[11px] uppercase tracking-wide text-encre-douce/60">
            <th className="px-4 py-3 font-medium">Nom</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Catégorie</th>
            <th className="px-4 py-3 font-medium">Naissance</th>
            <th className="px-4 py-3 font-medium">Contact</th>
            <th className="px-4 py-3 font-medium">Cotisation</th>
            <th className="px-4 py-3 font-medium">Licence</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody>
          {personnes.map((p) => (
            <tr key={p.id} className="border-b border-ligne last:border-b-0 hover:bg-sable/60">
              <td className="px-4 py-2.5 font-medium text-encre">
                <span className="inline-flex items-center gap-1.5">
                  {p.nom} {p.prenom}
                  {p.notes && (
                    <span title={p.notes} aria-label={`Note : ${p.notes}`}>
                      <MessageSquareText size={13} className="shrink-0 text-encre-douce/60" />
                    </span>
                  )}
                </span>
              </td>
              <td className="px-4 py-2.5 text-encre-douce">{p.adhesion?.type ?? '—'}</td>
              <td className="px-4 py-2.5 text-encre-douce">{p.adhesion?.categorie ?? '—'}</td>
              <td className="px-4 py-2.5 text-encre-douce">{formatDate(p.dateNaissance)}</td>
              <td className="px-4 py-2.5 text-encre-douce">
                <div className="flex flex-col">
                  {p.email && <span>{p.email}</span>}
                  {p.telephone && <span>{p.telephone}</span>}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span
                  className={
                    p.adhesion?.cotisationPayee
                      ? 'rounded-full bg-pin/10 px-2 py-0.5 text-[11.5px] text-pin'
                      : 'rounded-full bg-danger/10 px-2 py-0.5 text-[11.5px] text-danger'
                  }
                >
                  {p.adhesion?.cotisationPayee ? 'Payée' : 'Non payée'}
                </span>
              </td>
              <td className="px-4 py-2.5">
                {p.adhesion?.licence ? (
                  <span className="rounded-full bg-pin/10 px-2 py-0.5 text-[11.5px] text-pin">
                    {p.adhesion.licencePayee ? 'Payée' : 'Non payée'}
                  </span>
                ) : (
                  <span className="text-encre-douce/50">—</span>
                )}
              </td>
              <td className="px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Link
                    href={`/membres/${p.id}`}
                    aria-label={`Modifier ${p.nom} ${p.prenom}`}
                    className="text-encre-douce/60 hover:text-terracotta"
                  >
                    <Pencil size={14} />
                  </Link>
                  <button
                    type="button"
                    onClick={() => supprimer(p.id, `${p.prenom} ${p.nom}`)}
                    aria-label={`Retirer ${p.nom} ${p.prenom}`}
                    className="text-encre-douce/60 hover:text-danger"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
