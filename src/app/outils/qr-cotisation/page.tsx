import type { Metadata } from 'next';
import Link from 'next/link';
import { estMembreCA } from '@/lib/membres';
import { QrCotisationForm } from '@/components/QrCotisationForm';

export const metadata: Metadata = { title: 'QR Cotisation' };

export default async function QrCotisationPage() {
  const autorise = await estMembreCA();

  if (!autorise) {
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

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">QR Cotisation</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Génère un QR code SEPA (EPC) pré-rempli avec les coordonnées du club — à scanner depuis
          n&apos;importe quelle appli bancaire mobile pour lancer un virement.
        </p>
      </header>

      <QrCotisationForm />
    </main>
  );
}
