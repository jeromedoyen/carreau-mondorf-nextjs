import Image from 'next/image';
import Link from 'next/link';
import { LogIn, Eye } from 'lucide-react';
import { HeroAnimation } from '@/components/HeroAnimation';
import { CLUB } from '@/lib/club';

/** Page d'atterrissage (26/07/2026) — volontairement sans navigation
 *  (AppChrome.tsx la masque pour "/"), sans référence à un module précis
 *  (National D2/Promotion/saison) : juste le nom du club, une animation, et
 *  le choix entre se connecter (accès complet selon rôle, via NavLinks) ou
 *  "Simple visite" (-> /club, également sans nav — pas de porte dérobée
 *  vers le reste de l'appli sans connexion). */
export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-5 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-terracotta/10 blur-[2px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-10 h-56 w-56 rounded-full bg-marine/10"
      />

      <div className="mx-auto w-full max-w-4xl text-center">
        <div className="entree flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Image
            src="/logo.png"
            alt="Carreau Mondorf"
            width={500}
            height={261}
            priority
            className="h-16 w-auto shrink-0 sm:h-24"
          />
          <h1 className="font-display text-[clamp(2.2rem,6vw,4rem)] leading-[0.98] font-semibold italic text-encre">
            Carreau
            <br />
            Boules &amp; Pétanque
            <br />
            Mondorf-les-Bains
          </h1>
        </div>

        <div className="mt-12 grid grid-cols-1 items-center gap-10 sm:grid-cols-2 sm:text-left">
          <div className="entree" style={{ animationDelay: '0.1s' }}>
            <HeroAnimation />
          </div>

          <div className="entree flex flex-col items-center gap-3.5 sm:items-start" style={{ animationDelay: '0.2s' }}>
            <Link
              href="/connexion"
              className="group flex w-full max-w-xs items-center justify-center gap-2.5 rounded-full bg-terracotta px-7 py-3.5 text-[15px] font-medium text-white shadow-[0_10px_30px_-10px_rgba(193,82,43,0.6)] transition-transform hover:-translate-y-0.5 sm:justify-start"
            >
              <LogIn size={18} />
              Connexion
            </Link>
            <Link
              href="/club"
              className="flex w-full max-w-xs items-center justify-center gap-2.5 rounded-full border border-ligne bg-sable-carte px-7 py-3.5 text-[15px] font-medium text-encre transition-transform hover:-translate-y-0.5 sm:justify-start"
            >
              <Eye size={18} />
              Simple visite
            </Link>
          </div>
        </div>
      </div>

      <footer className="relative mt-16 text-center text-[11.5px] leading-relaxed text-encre-douce/50">
        {CLUB.nomComplet} — {CLUB.rcs}
        <br />
        {CLUB.siegeSocial}
      </footer>
    </main>
  );
}
