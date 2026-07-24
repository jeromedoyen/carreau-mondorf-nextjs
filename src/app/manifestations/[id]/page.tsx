import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin } from 'lucide-react';
import { NouveauCreneauForm } from '@/components/NouveauCreneauForm';
import { CreneauAffectations } from '@/components/CreneauAffectations';
import { getManifestationDetail, estUtilisateurAutorise } from '@/lib/manifestations';

export const metadata: Metadata = { title: 'Détail manifestation' };

const CATEGORIE_COULEUR: Record<string, string> = {
  Buvette: 'bg-terracotta/15 text-terracotta-dark',
  Cuisine: 'bg-laiton/20 text-laiton',
  Terrain: 'bg-pin/15 text-pin',
  Accueil: 'bg-marine/15 text-marine',
};

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
        <h1 className="font-display mt-1 text-3xl italic">Réservé aux licenciés</h1>
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
      </header>

      <h2 className="font-display mb-4 text-xl italic">Créneaux &amp; bénévoles</h2>

      <NouveauCreneauForm manifestationId={manifestation.id} />

      {creneaux.length === 0 ? (
        <p className="text-[14px] text-encre-douce">Aucun créneau enregistré pour cette manifestation.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {creneaux.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-display text-[15px]">{c.tache}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      CATEGORIE_COULEUR[c.categorie] ?? 'bg-encre-douce/15 text-encre-douce'
                    }`}
                  >
                    {c.categorie}
                  </span>
                </div>
                <span className="text-[12.5px] text-encre-douce">
                  {new Date(c.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  {c.heureDebut && ` · ${c.heureDebut}${c.heureFin ? `–${c.heureFin}` : c.finImprecise ? '…' : ''}`}
                </span>
              </div>

              <CreneauAffectations
                manifestationId={manifestation.id}
                creneauId={c.id}
                affectations={c.affectations}
                postesPrevus={c.postesPrevus}
              />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
