'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';

/** Sélecteur de saison réutilisable — pose la brique "vision historique
 *  année par année" (Phase 0). Change `?saison=` dans l'URL courante, la
 *  page serveur relit ce paramètre pour refetcher les bonnes données. */
export function SaisonSwitcher({ saisons, actuelle }: { saisons: string[]; actuelle: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function choisir(saison: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('saison', saison);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex gap-1.5">
      {saisons.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => choisir(s)}
          aria-current={s === actuelle}
          className={`rounded-full px-3 py-1 text-[12.5px] transition-colors ${
            s === actuelle
              ? 'bg-terracotta text-white'
              : 'border border-ligne bg-sable-carte text-encre-douce hover:border-terracotta'
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
