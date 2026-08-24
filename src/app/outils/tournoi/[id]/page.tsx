import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { estMembreCA } from '@/lib/membres';
import { getTournoiComplet, getCandidatsParticipants } from '@/lib/tournoi/donnees';
import { TournoiEcran } from '@/components/TournoiEcran';

export const metadata: Metadata = { title: 'Tournoi' };

export default async function TournoiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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

  const complet = await getTournoiComplet(Number(id));
  if (!complet) notFound();

  // Le registre ne sert qu'à composer la liste : inutile de le charger une
  // fois le tournoi lancé.
  const candidats =
    complet.tournoi.statut === 'preparation' ? await getCandidatsParticipants() : [];

  return (
    <TournoiEcran
      tournoi={complet.tournoi}
      participants={complet.participants}
      equipesPermanentes={complet.equipesPermanentes}
      partiesDetail={complet.partiesDetail}
      equipesParId={complet.equipesParId}
      classement={complet.classement}
      libelles={complet.libelles}
      candidats={candidats}
    />
  );
}
