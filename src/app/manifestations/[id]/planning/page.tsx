import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PlanningManifestation } from '@/components/PlanningManifestation';
import { getManifestationDetail, estUtilisateurAutorise } from '@/lib/manifestations';

export const metadata: Metadata = { title: 'Planning' };

/** Sortie sur sa propre page (26/07/2026, retour Jérôme) plutôt qu'affiché
 *  en bas du détail de manifestation — plus lisible, et le détail garde le
 *  focus sur la saisie des créneaux/bénévoles. Accessible via le bouton
 *  "Voir le planning" à côté d'"Ajouter un créneau". */
export default async function PlanningManifestationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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

  const { id } = await params;
  const detail = await getManifestationDetail(Number(id));
  if (!detail) notFound();
  const { manifestation, creneaux } = detail;

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <Link
        href={`/manifestations/${manifestation.id}`}
        className="text-[13px] text-encre-douce hover:text-terracotta"
      >
        ← {manifestation.nom}
      </Link>

      <header className="entree mt-4 mb-7">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">PLANNING</p>
        <h1 className="font-display mt-1 text-3xl italic">{manifestation.nom}</h1>
      </header>

      {creneaux.length === 0 ? (
        <p className="text-[14px] text-encre-douce">Aucun créneau enregistré pour cette manifestation.</p>
      ) : (
        <PlanningManifestation manifestation={manifestation} creneaux={creneaux} />
      )}
    </main>
  );
}
