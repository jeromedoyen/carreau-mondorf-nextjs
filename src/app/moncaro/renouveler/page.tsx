import type { Metadata } from 'next';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { getSaisonActive } from '@/lib/saisons';
import { getMesInformationsPersonnelles } from '@/lib/moncaro';
import { ReinscriptionForm } from '@/components/ReinscriptionForm';

export const metadata: Metadata = { title: 'Renouveler mon adhésion' };

export default async function RenouvelerPage() {
  const autorise = await estUtilisateurAutorise();

  if (!autorise) {
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

  const supabase = await createClient();
  const [saison, prefill] = await Promise.all([
    getSaisonActive(),
    getMesInformationsPersonnelles(supabase).catch(() => null),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/moncaro" className="text-[13px] text-encre-douce hover:text-terracotta">
        ← Moncaro
      </Link>

      <header className="entree mt-4 mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">RENOUVELLEMENT</p>
        <h1 className="font-display mt-1 text-4xl italic">Renouveler mon adhésion</h1>
        <p className="mt-2 text-[13.5px] text-encre-douce">
          Vérifie et complète tes informations pour la saison {saison} — le comité validera ta demande, puis un
          appel de paiement t&apos;apparaîtra sur cette page.
        </p>
      </header>

      <ReinscriptionForm prefill={prefill} saison={saison} />
    </main>
  );
}
