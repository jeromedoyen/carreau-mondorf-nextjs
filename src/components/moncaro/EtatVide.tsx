import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';

/** État vide partagé du tableau de bord. Dit ce qui manque et pourquoi,
 *  plutôt que d'afficher un zéro qui laisserait croire à un mauvais
 *  résultat — « aucune donnée » et « zéro victoire » ne racontent pas la
 *  même chose, et la nuance compte pour le licencié qui se relit. */
export function EtatVide({
  icone: Icone,
  titre,
  detail,
  action,
}: {
  icone: LucideIcon;
  titre: string;
  detail?: string;
  action?: { libelle: string; href: string };
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sable text-encre-douce/60">
        <Icone size={18} aria-hidden="true" />
      </span>
      <p className="text-[13.5px] text-encre">{titre}</p>
      {detail && <p className="max-w-sm text-[12.5px] leading-relaxed text-encre-douce">{detail}</p>}
      {action && (
        <Link
          href={action.href}
          className="mt-1 rounded-lg px-2 py-1 text-[12.5px] text-terracotta hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          {action.libelle} →
        </Link>
      )}
    </div>
  );
}
