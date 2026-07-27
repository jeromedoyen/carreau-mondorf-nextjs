import type { Metadata } from 'next';
import Link from 'next/link';
import { estMembreCA } from '@/lib/membres';
import { getParametresClub, getAppelsPaiement } from '@/lib/paiements';
import { getSaisonActive } from '@/lib/saisons';
import { ListeRelancesPaiement } from '@/components/ListeRelancesPaiement';

export const metadata: Metadata = { title: 'Paiements en attente' };

export default async function PaiementsEnAttentePage() {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Réservé au comité</h1>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const [parametres, appels, saisonActive] = await Promise.all([
    getParametresClub(),
    getAppelsPaiement(),
    getSaisonActive(),
  ]);
  const enAttente = appels.filter((a) => a.statut === 'en_attente' && a.emailEnvoyeLe);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/outils/paiements" className="text-[13px] text-encre-douce hover:text-terracotta">
        ← Paiements
      </Link>
      <header className="entree mt-4 mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">Paiements en attente</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Appels de cotisation dont l&apos;email de relance a déjà été envoyé — à pointer avec les relevés
          de compte, puis à valider un par un.
        </p>
      </header>

      <ListeRelancesPaiement appels={enAttente} parametres={parametres} saisonActive={saisonActive} />
    </main>
  );
}
