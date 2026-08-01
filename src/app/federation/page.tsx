import type { Metadata } from 'next';
import Link from 'next/link';
import { ControleFederation } from '@/components/ControleFederation';
import { estMembreCA } from '@/lib/membres';
import { getSaisons, getSaisonActive } from '@/lib/saisons';
import { getHistoriqueControlesFederation } from '@/lib/federation';

export const metadata: Metadata = { title: 'Contrôle fédération' };

/** Port de Federation.html (v1, 26/07/2026) : upload d'un fichier Excel
 *  fourni par la fédération, comparaison avec le registre des licenciés
 *  du club. Remplace l'ancien contenu de /federation (gestion du calendrier
 *  fédération — fonctionnalité différente, déplacée sur
 *  /federation/calendrier, les deux restant groupées sous "Outils"). */
export default async function FederationPage() {
  const ca = await estMembreCA();

  if (!ca) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Accès restreint</h1>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] text-encre-douce">
          Cette page est réservée aux membres du comité d&apos;administration, connectés avec leur
          adresse autorisée.
        </p>
        <Link
          href="/connexion"
          className="mt-5 inline-block rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90"
        >
          Se connecter
        </Link>
      </main>
    );
  }

  const [saisons, saisonActive, historique] = await Promise.all([
    getSaisons(),
    getSaisonActive(),
    getHistoriqueControlesFederation(),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">RÉSERVÉ AU CA</p>
        <h1 className="font-display mt-1 text-4xl italic">Contrôle fédération</h1>
        <p className="mt-2 max-w-xl text-[13.5px] text-encre-douce">
          Compare le registre des licenciés du club avec le fichier officiel de la FLBP pour
          détecter les écarts (licence, catégorie, classe...) et les licenciés manquants d&apos;un
          côté ou de l&apos;autre.
        </p>
      </header>

      <ControleFederation
        saisons={saisons.map((s) => s.libelle)}
        saisonActive={saisonActive}
        historique={historique}
      />
    </main>
  );
}
