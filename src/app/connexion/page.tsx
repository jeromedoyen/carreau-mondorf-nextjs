import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { ConnexionForm } from '@/components/ConnexionForm';
import { HeroAnimationConnexion } from '@/components/HeroAnimationConnexion';

export const metadata: Metadata = { title: 'Connexion' };

/** Sans navigation (AppChrome.tsx) — ce n'est qu'une invitation à se
 *  connecter, pas la peine d'afficher un menu qu'on ne peut pas encore
 *  utiliser. "Espace privé" plutôt que "licenciés" (26/07/2026) : les
 *  membres non-licenciés et le CA s'y connectent aussi. */
export default function ConnexionPage() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-16">
      <div className="mx-auto w-full max-w-4xl">
        <Link href="/" className="entree mb-10 flex items-center justify-center gap-2.5">
          <Image src="/logo.png" alt="Carreau Mondorf" width={500} height={261} priority className="h-14 w-auto" />
        </Link>

        <div className="grid grid-cols-1 items-center gap-10 sm:grid-cols-2">
          <div className="entree" style={{ animationDelay: '0.1s' }}>
            <HeroAnimationConnexion />
          </div>

          <div className="entree" style={{ animationDelay: '0.2s' }}>
            <p className="text-center font-score text-[13px] tracking-[0.2em] text-terracotta sm:text-left">
              CONNEXION
            </p>
            <h1 className="font-display mt-1 text-center text-4xl italic sm:text-left">Espace privé</h1>
            <p className="mx-auto mt-2 max-w-md text-center text-[13.5px] text-encre-douce sm:mx-0 sm:text-left">
              Réservé aux licenciés, membres et comité du club. Entrez votre
              email, vous recevrez un code de connexion valable quelques
              minutes.
            </p>
            <div className="mt-6">
              <ConnexionForm />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
