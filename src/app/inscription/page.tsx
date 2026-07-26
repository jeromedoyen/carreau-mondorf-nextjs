import type { Metadata } from 'next';
import { InscriptionForm } from '@/components/InscriptionForm';

export const metadata: Metadata = {
  title: 'Inscription',
  description: 'Demande d’inscription ou de réinscription au Club Carreau Boules et Pétanque Mondorf a.s.b.l.',
};

export default function InscriptionPage() {
  return (
    <main className="mx-auto max-w-2xl px-5 py-14">
      <header className="entree mb-9 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">REJOIGNEZ-NOUS</p>
        <h1 className="font-display mt-1 text-4xl italic">Inscription / Réinscription</h1>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] text-encre-douce">
          Remplissez ce formulaire, le comité examinera votre demande et reviendra vers vous par
          email.
        </p>
      </header>
      <InscriptionForm />
    </main>
  );
}
