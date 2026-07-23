import type { PersonneAvecAdhesion } from '@/lib/types';

function formatDate(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Server Component pur (pas de tri/filtre interactif pour l'instant,
 *  contrairement aux tableaux de stats) — le registre est déjà réservé au
 *  CA via la RLS, pas besoin d'ajouter de complexité tant que le besoin
 *  précis (recherche ? export ?) n'est pas exprimé. */
export function RegistreMembres({ personnes }: { personnes: PersonneAvecAdhesion[] }) {
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
          </tr>
        </thead>
        <tbody>
          {personnes.map((p) => (
            <tr key={p.id} className="border-b border-ligne last:border-b-0 hover:bg-sable/60">
              <td className="px-4 py-2.5 font-medium text-encre">
                {p.nom} {p.prenom}
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
