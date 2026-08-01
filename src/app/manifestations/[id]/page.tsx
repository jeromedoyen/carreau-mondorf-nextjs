import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, CalendarRange } from 'lucide-react';
import { NouveauCreneauForm } from '@/components/NouveauCreneauForm';
import { ModifierManifestationForm } from '@/components/ModifierManifestationForm';
import { CreneauCard } from '@/components/CreneauCard';
import { getManifestationDetail, estUtilisateurAutorise } from '@/lib/manifestations';
import { estMembreCA, getNomsMembres } from '@/lib/membres';

export const metadata: Metadata = { title: 'Détail manifestation' };

export default async function ManifestationDetailPage({
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
  const [detail, ca] = await Promise.all([getManifestationDetail(Number(id)), estMembreCA()]);
  if (!detail) notFound();
  const { manifestation, creneaux } = detail;
  // RLS ("lecture CA uniquement" sur personnes) filtre déjà cet appel pour
  // un non-CA — ne le déclenche que si ca, pour ne pas payer l'aller-retour
  // inutilement.
  const nomsMembres = ca ? await getNomsMembres() : [];

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/manifestations" className="text-[13px] text-encre-douce hover:text-terracotta">
        ← Manifestations
      </Link>

      <header className="entree mt-4 mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
          SAISON {manifestation.saison} · {manifestation.statut.toUpperCase()}
        </p>
        <h1 className="font-display mt-1 text-3xl italic">{manifestation.nom}</h1>
        {manifestation.lieu && (
          <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-encre-douce">
            <MapPin size={15} />
            {manifestation.lieu}
          </p>
        )}
        {manifestation.notes && <p className="mt-3 text-[13.5px] leading-relaxed text-encre-douce">{manifestation.notes}</p>}
        {ca && (
          <ModifierManifestationForm
            id={manifestation.id}
            nom={manifestation.nom}
            type={manifestation.type}
            statut={manifestation.statut}
            dateDebut={manifestation.dateDebut}
            dateFin={manifestation.dateFin}
          />
        )}
      </header>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl italic">Créneaux &amp; bénévoles</h2>
        {creneaux.length > 0 && (
          <Link
            href={`/manifestations/${manifestation.id}/planning`}
            className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-4 py-2 text-[13px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta"
          >
            <CalendarRange size={15} />
            Voir le planning
          </Link>
        )}
      </div>

      {ca && <NouveauCreneauForm manifestationId={manifestation.id} />}

      {creneaux.length === 0 ? (
        <p className="text-[14px] text-encre-douce">Aucun créneau enregistré pour cette manifestation.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {creneaux.map((c) => (
            <CreneauCard
              key={c.id}
              manifestationId={manifestation.id}
              creneau={c}
              ca={ca}
              nomsMembres={nomsMembres}
            />
          ))}
        </div>
      )}
    </main>
  );
}
