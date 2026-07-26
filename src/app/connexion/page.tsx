import type { Metadata } from 'next';
import { ConnexionForm } from '@/components/ConnexionForm';

export const metadata: Metadata = { title: 'Connexion' };

export default function ConnexionPage() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-16">
      <header className="entree mb-9 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">CONNEXION</p>
        <h1 className="font-display mt-1 text-4xl italic">Espace licenciés</h1>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-encre-douce">
          Réservé aux licenciés du club. Entrez votre email, vous recevrez un
          code de connexion valable quelques minutes.
        </p>
      </header>
      <ConnexionForm />
    </main>
  );
}
