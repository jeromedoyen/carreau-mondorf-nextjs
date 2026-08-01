import type { Metadata } from 'next';
import Link from 'next/link';
import { estMembreCA } from '@/lib/membres';
import { getSaisonActive } from '@/lib/saisons';
import { getFichesMembres } from '@/lib/fichesMembres';
import { GenererFichesMembresBouton } from '@/components/GenererFichesMembresBouton';
import { FicheIndividuelleForm } from '@/components/FicheIndividuelleForm';

export const metadata: Metadata = { title: 'Fiches membres' };

export default async function FichesMembresPage() {
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

  const annee = await getSaisonActive();
  const fiches = await getFichesMembres(annee);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">Fiches membres {annee}</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Une fiche synthétique par personne — identité, coordonnées, adhésion, paiements. Le PDF produit un
          classeur imprimable (une page par personne) ; le JSON et le CSV donnent les mêmes données dans un
          format directement réutilisable.
        </p>
      </header>

      <div className="mb-6 rounded-2xl border border-ligne bg-sable-carte p-5">
        <GenererFichesMembresBouton fiches={fiches} annee={annee} />
      </div>

      <div className="mb-6 rounded-2xl border border-ligne bg-sable-carte p-5">
        <FicheIndividuelleForm fiches={fiches} annee={annee} />
      </div>

      <p className="text-[13px] text-encre-douce">
        {fiches.length} personne{fiches.length > 1 ? 's' : ''} enregistrée{fiches.length > 1 ? 's' : ''}.
      </p>
    </main>
  );
}
