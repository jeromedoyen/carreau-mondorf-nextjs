import type { Metadata } from 'next';
import Link from 'next/link';
import { estUtilisateurAutorise } from '@/lib/manifestations';
import { getSaisonActive } from '@/lib/saisons';
import { SaisieConcoursEtSuivi } from '@/components/SaisieConcoursEtSuivi';

export const metadata: Metadata = { title: 'Mes concours' };

/** Saisie manuelle d'un concours extérieur (chef d'équipe) + suivi
 *  personnel des remboursements — cahier des charges §3/§5 du module
 *  remboursements v2 (02/08/2026). Ouvert à tout licencié connecté (pas
 *  seulement CA) : "réservé aux compétiteurs licenciés", vérifié
 *  côté client (comme StatistiquesD2.tsx) via est_licencie(), la page
 *  Server Component reste légère. */
export default async function ConcoursPage() {
  const autorise = await estUtilisateurAutorise();
  if (!autorise) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 text-center">
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

  const saison = await getSaisonActive();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">MES CONCOURS</p>
        <h1 className="font-display mt-1 text-4xl italic">Concours &amp; remboursements</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Déclare ta participation à un concours hors championnat/Promotion (en tant que chef d&apos;équipe), et
          suis le statut de tes remboursements.
        </p>
      </header>

      <SaisieConcoursEtSuivi saison={saison} />
    </main>
  );
}
