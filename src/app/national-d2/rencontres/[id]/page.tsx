import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RencontreCAPanel } from '@/components/RencontreCAPanel';
import { VueRencontreD2 } from '@/components/VueRencontreD2';
import { getRencontreD2ParId } from '@/lib/data';
import { getRencontreDetail, getPartiesRencontreVisibles } from '@/lib/rencontreDetail';
import { estMembreCA } from '@/lib/membres';

const LABEL_STATUT: Record<string, string> = {
  ForfaitCM: 'Forfait Carreau Mondorf enregistré',
  ForfaitAdverse: "Forfait de l'adversaire enregistré",
};

function EnTete({
  journee,
  domicile,
  adversaire,
  statut,
  sousTitre,
}: {
  journee: number;
  domicile: boolean | null;
  adversaire: string | null;
  statut: string;
  sousTitre: string;
}) {
  return (
    <header className="entree mb-9">
      <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
        J{journee} · {sousTitre}
      </p>
      <h1 className="font-display mt-1 text-4xl italic">
        {domicile ? `Carreau Mondorf — ${adversaire}` : `${adversaire} — Carreau Mondorf`}
      </h1>
      {LABEL_STATUT[statut] && <p className="mt-2 text-[13px] font-medium text-danger">{LABEL_STATUT[statut]}</p>}
    </header>
  );
}

function AccesRestreint() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16 text-center">
      <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
      <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
      <p className="mx-auto mt-3 max-w-md text-[13.5px] text-encre-douce">
        Le détail de cette rencontre est réservé au comité d&apos;administration, à la commission sportive, et aux
        joueurs y ayant participé, connectés avec leur adresse autorisée.
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

/** Trois cas, du plus au moins large : CA (consultation + édition, cf.
 *  RencontreCAPanel), joueur ayant participé/commission sportive
 *  (consultation seule, via la RPC parties_rencontre_d2), sinon accès
 *  restreint — "pas de vue globale pour eux sauf pour ce qui les concerne
 *  personnellement" (retour Jérôme via /pb, 01/08/2026). */
export default async function RencontrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rencontreId = Number(id);

  const [rencontre, ca] = await Promise.all([getRencontreD2ParId(rencontreId), estMembreCA()]);
  if (!rencontre) notFound();

  if (ca) {
    const detail = await getRencontreDetail(rencontreId);
    if (!detail) notFound();
    return (
      <main className="mx-auto max-w-5xl px-5 py-12">
        <EnTete
          journee={rencontre.journee}
          domicile={rencontre.domicile}
          adversaire={rencontre.adversaire}
          statut={rencontre.statut}
          sousTitre="RÉSERVÉ AU CA"
        />
        <RencontreCAPanel rencontre={detail} />
      </main>
    );
  }

  const parties = await getPartiesRencontreVisibles(rencontreId);
  if (!parties.length) return <AccesRestreint />;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <EnTete
        journee={rencontre.journee}
        domicile={rencontre.domicile}
        adversaire={rencontre.adversaire}
        statut={rencontre.statut}
        sousTitre="CONSULTATION"
      />
      <VueRencontreD2 parties={parties} />
    </main>
  );
}
