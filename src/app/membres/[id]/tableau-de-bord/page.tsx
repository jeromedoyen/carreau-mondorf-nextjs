import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye } from 'lucide-react';
import { estMembreCA } from '@/lib/membres';
import { getSaisonActive, getSaisons } from '@/lib/saisons';
import { getTableauDeBordMembre } from '@/lib/tableauDeBordMembre';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { TableauDeBordMoncaro } from '@/components/TableauDeBordMoncaro';

export const metadata: Metadata = { title: 'Tableau de bord du membre' };

/** Le tableau de bord d'un licencié, vu par le comité depuis sa fiche.
 *
 *  N'ouvre aucun accès nouveau : `parties_d2` et `adhesions` sont déjà
 *  lisibles par le CA, et les statistiques individuelles de tous les
 *  joueurs s'affichent déjà sur `/national-d2`. Ce que cet écran apporte,
 *  c'est la même lecture que celle du licencié, utile pour l'accompagner
 *  ou vérifier ce qu'il voit.
 *
 *  Les remboursements font exception : la RLS de `participations_concours`
 *  (migration 0047) les réserve à la trésorerie. La carte disparaît donc
 *  pour un membre du CA qui n'en fait pas partie, et l'écran le dit. */
export default async function TableauDeBordMembrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saison?: string }>;
}) {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const [{ id }, { saison: saisonDemandee }, saisons, saisonActive] = await Promise.all([
    params,
    searchParams,
    getSaisons(),
    getSaisonActive(),
  ]);
  const saison = saisons.some((s) => s.libelle === saisonDemandee)
    ? (saisonDemandee as string)
    : saisonActive;

  const tableau = await getTableauDeBordMembre(Number(id), saison);
  if (!tableau) notFound();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/membres/${id}`}
          className="rounded-lg text-[13px] text-encre-douce hover:text-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
        >
          ← Fiche de {tableau.nomComplet}
        </Link>
        {saisons.length > 1 && (
          <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
        )}
      </div>

      <p className="mt-4 flex items-center gap-2 rounded-xl border border-ligne bg-sable-carte px-4 py-2.5 text-[12.5px] text-encre-douce">
        <Eye size={14} className="shrink-0 text-terracotta" aria-hidden="true" />
        <span>
          Vous consultez ce que ce membre voit sur son espace personnel.
          {!tableau.concoursVisible && ' Les remboursements sont réservés à la trésorerie et n’apparaissent pas ici.'}
        </span>
      </p>

      <div className="mt-5">
        <TableauDeBordMoncaro
          consultation
          saison={saison}
          adhesion={tableau.adhesion}
          parametres={null}
          benevolat={tableau.benevolat}
          statsVisibles
          concoursVisible={tableau.concoursVisible}
          monNom={tableau.nomComplet}
          bilan={tableau.bilan}
          statsPromotion={null}
          entreePromotion={tableau.entreePromotion}
          journeesPromotionSaison={tableau.journeesPromotionSaison}
          rangNational={tableau.rangNational}
          rangPromotion={tableau.rangPromotion}
          division={tableau.division}
          participationsConcours={tableau.participationsConcours}
        />
      </div>
    </main>
  );
}
