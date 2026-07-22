import Link from 'next/link';
import { Trophy, Users2, ArrowUpRight } from 'lucide-react';
import { getClassementDivisionD2 } from '@/lib/data';
import { CLUB_CARREAU_MONDORF } from '@/lib/types';

export default async function Home() {
  let rangActuel: number | null = null;
  let journeeActuelle: number | null = null;
  try {
    const classement = await getClassementDivisionD2('2026');
    const evoCM = classement.evolution[CLUB_CARREAU_MONDORF];
    const dernier = evoCM?.[evoCM.length - 1];
    if (dernier) {
      rangActuel = dernier.rang;
      journeeActuelle = dernier.journee;
    }
  } catch {
    // La page reste belle même si Supabase est momentanément indisponible.
  }

  return (
    <main className="relative flex flex-1 flex-col overflow-hidden">
      {/* Boules décoratives, en surplomb du cadre — composition asymétrique
          plutôt qu'un hero centré générique. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-terracotta/15 blur-[2px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-10 top-40 h-24 w-24 rounded-full bg-pin/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 bottom-10 h-56 w-56 rounded-full bg-marine/10"
      />

      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-20">
        <p className="entree font-score text-sm tracking-[0.25em] text-terracotta">
          NATIONAL D2 · PROMOTION · SAISON 2026
        </p>
        <h1 className="entree mt-3 max-w-3xl font-display text-[clamp(2.5rem,7vw,5rem)] leading-[0.98] font-semibold italic text-encre">
          Carreau Boules
          <br />
          &amp; Pétanque Mondorf
        </h1>
        <p
          className="entree mt-6 max-w-xl text-[15px] leading-relaxed text-encre-douce"
          style={{ animationDelay: '0.1s' }}
        >
          Calendrier, classement et statistiques du club — recalculés en direct
          depuis les résultats officiels de la poule, sans jamais quitter le terrain.
        </p>

        {rangActuel && (
          <div
            className="entree mt-9 inline-flex w-fit items-center gap-4 rounded-2xl border border-ligne bg-sable-carte px-6 py-4 shadow-[0_6px_24px_-8px_rgba(36,27,18,0.25)]"
            style={{ animationDelay: '0.18s' }}
          >
            <span className="font-score text-5xl leading-none text-terracotta">
              {rangActuel}
              <sup className="text-xl">{rangActuel === 1 ? 'er' : 'e'}</sup>
            </span>
            <span className="max-w-[14rem] text-[13px] leading-snug text-encre-douce">
              de la poule National&nbsp;D2 à l&apos;issue de la journée {journeeActuelle}
            </span>
          </div>
        )}

        <div
          className="entree mt-10 flex flex-wrap gap-4"
          style={{ animationDelay: '0.26s' }}
        >
          <Link
            href="/national-d2"
            className="group flex items-center gap-3 rounded-2xl bg-pin px-6 py-4 text-sable-carte shadow-[0_10px_30px_-10px_rgba(36,70,58,0.55)] transition-transform hover:-translate-y-0.5"
          >
            <Trophy size={20} />
            <span>
              <span className="block font-display text-lg leading-tight">National D2</span>
              <span className="block text-[12px] text-sable-carte/70">Calendrier &amp; classement</span>
            </span>
            <ArrowUpRight
              size={18}
              className="ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
          <Link
            href="/promotion"
            className="group flex items-center gap-3 rounded-2xl border border-ligne bg-sable-carte px-6 py-4 text-encre shadow-[0_10px_30px_-12px_rgba(36,27,18,0.25)] transition-transform hover:-translate-y-0.5"
          >
            <Users2 size={20} className="text-terracotta" />
            <span>
              <span className="block font-display text-lg leading-tight">Promotion</span>
              <span className="block text-[12px] text-encre-douce">Équipes &amp; résultats</span>
            </span>
            <ArrowUpRight
              size={18}
              className="ml-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>
        </div>
      </section>
    </main>
  );
}
