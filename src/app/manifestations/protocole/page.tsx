import type { Metadata } from 'next';
import Link from 'next/link';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { getMonNomBenevole } from '@/lib/benevolat';
import { FormulaireProtocoleManifestation } from '@/components/FormulaireProtocoleManifestation';
import { ReveilDocumensoAuChargement } from '@/components/ReveilDocumensoAuChargement';

export const metadata: Metadata = { title: 'Organiser une manifestation' };

export default async function ProtocoleManifestationPage() {
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

  const monNom = await getMonNomBenevole();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <ReveilDocumensoAuChargement />
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">MANIFESTATIONS · NOUVELLE DEMANDE</p>
        <h1 className="font-display mt-1 text-4xl italic">Organiser une manifestation</h1>
        <p className="mt-2 text-[13.5px] text-encre-douce">
          Ce formulaire remplace la fiche papier &quot;Protocole Manifestation&quot;. Une fois validé, le document se
          génère et s&apos;ouvre pour signature — pas d&apos;impression, pas d&apos;envoi manuel.
        </p>
      </header>

      <FormulaireProtocoleManifestation monNom={monNom} />
    </main>
  );
}
