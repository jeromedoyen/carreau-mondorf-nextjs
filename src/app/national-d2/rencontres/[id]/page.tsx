import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FeuilleDeMatch } from '@/components/FeuilleDeMatch';
import { ForfaitPanel } from '@/components/ForfaitPanel';
import { getRencontreDetail } from '@/lib/data';
import { estMembreCA } from '@/lib/membres';

const LABEL_STATUT: Record<string, string> = {
  ForfaitCM: 'Forfait Carreau Mondorf enregistré',
  ForfaitAdverse: "Forfait de l'adversaire enregistré",
};

export default async function SaisieRencontrePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Réservé au comité</h1>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] text-encre-douce">
          La saisie des résultats est réservée aux membres du comité
          d&apos;administration, connectés avec leur adresse autorisée.
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

  const rencontre = await getRencontreDetail(Number(id));
  if (!rencontre) notFound();

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
          J{rencontre.journee} · RÉSERVÉ AU CA
        </p>
        <h1 className="font-display mt-1 text-4xl italic">
          {rencontre.domicile ? `Carreau Mondorf — ${rencontre.adversaire}` : `${rencontre.adversaire} — Carreau Mondorf`}
        </h1>
        {LABEL_STATUT[rencontre.statut] && (
          <p className="mt-2 text-[13px] font-medium text-danger">{LABEL_STATUT[rencontre.statut]}</p>
        )}
      </header>
      <div className="flex flex-col gap-6">
        <ForfaitPanel rencontreId={rencontre.id} adversaire={rencontre.adversaire ?? 'l’adversaire'} />
        <FeuilleDeMatch rencontre={rencontre} />
      </div>
    </main>
  );
}
