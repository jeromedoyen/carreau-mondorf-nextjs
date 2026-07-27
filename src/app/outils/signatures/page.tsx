import type { Metadata } from 'next';
import Link from 'next/link';
import { estMembreCA } from '@/lib/membres';
import { getDemandesSignature, getSignatairesCA } from '@/lib/signatures';
import { NouvelleDemandeSignatureForm } from '@/components/NouvelleDemandeSignatureForm';
import { ListeDemandesSignature } from '@/components/ListeDemandesSignature';

export const metadata: Metadata = { title: 'Signatures électroniques' };

export default async function SignaturesPage() {
  const ca = await estMembreCA();

  if (!ca) {
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

  const [demandes, signataires] = await Promise.all([getDemandesSignature(), getSignatairesCA()]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">Signatures électroniques</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Fais signer un PV ou un compte rendu par un ou plusieurs membres du CA. Prépare le document et la
          liste des signataires ici, envoie-le toi-même depuis DocuSeal (gratuit, mais sans lien automatique
          avec cette page), puis reviens pointer qui a signé.
        </p>
      </header>

      <div className="mb-8">
        <NouvelleDemandeSignatureForm signataires={signataires} />
      </div>

      <ListeDemandesSignature demandes={demandes} docusealUrl={process.env.DOCUSEAL_API_URL} />
    </main>
  );
}
