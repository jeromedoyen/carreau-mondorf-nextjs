import type { Metadata } from 'next';
import Link from 'next/link';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { NouvelEvenementFederationForm } from '@/components/NouvelEvenementFederationForm';
import { ListeEvenementsFederation } from '@/components/ListeEvenementsFederation';
import { getCalendrierFederationAdmin } from '@/lib/data';
import { estMembreCA } from '@/lib/membres';
import { getSaisons, getSaisonActive } from '@/lib/saisons';

export const metadata: Metadata = { title: 'Calendrier fédération' };

/** Déplacé depuis /federation le 26/07/2026 : cette page gère la saisie
 *  du calendrier fédération (tournois, Coupe de Luxembourg...), une
 *  fonctionnalité différente du "Contrôle fédération FLBP" (comparaison
 *  Excel licenciés) qui a pris sa place sur /federation — les deux
 *  restent regroupées sous le menu "Outils" (OutilsMenu.tsx). */
export default async function FederationCalendrierPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] text-encre-douce">
          Cette page est réservée aux membres du comité d&apos;administration, connectés avec leur
          adresse autorisée.
        </p>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const [{ saison: saisonDemandee }, saisons, saisonActive] = await Promise.all([
    searchParams,
    getSaisons(),
    getSaisonActive(),
  ]);
  const saison = saisonDemandee ?? saisonActive;
  const evenements = await getCalendrierFederationAdmin(saison);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
            SAISON {saison} · RÉSERVÉ AU CA
          </p>
          <h1 className="font-display mt-1 text-4xl italic">Calendrier fédération</h1>
          <p className="mt-2 max-w-md text-[13px] text-encre-douce">
            Tournois, championnats individuels, Coupe de Luxembourg et journées Promotion — saisis
            ici chaque saison à partir du calendrier officiel FLBP, visibles ensuite sur{' '}
            <Link href="/calendrier" className="text-terracotta hover:underline">
              le calendrier public
            </Link>
            .
          </p>
        </div>
        <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
      </header>

      <NouvelEvenementFederationForm />
      <ListeEvenementsFederation evenements={evenements} />
    </main>
  );
}
