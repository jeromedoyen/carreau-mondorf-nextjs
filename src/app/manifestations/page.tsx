import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, MapPin } from 'lucide-react';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { getManifestations, estUtilisateurAutorise } from '@/lib/manifestations';
import { getSaisons, getSaisonActive } from '@/lib/saisons';

export const metadata: Metadata = { title: 'Manifestations' };

const STATUT_COULEUR: Record<string, string> = {
  Planifiée: 'bg-marine/15 text-marine',
  Confirmée: 'bg-pin/15 text-pin',
  Annulée: 'bg-danger/15 text-danger',
  Terminée: 'bg-encre-douce/15 text-encre-douce',
};

export default async function ManifestationsPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const autorise = await estUtilisateurAutorise();

  if (!autorise) {
    return (
      <main className="mx-auto max-w-5xl px-5 py-16 text-center">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">ACCÈS RESTREINT</p>
        <h1 className="font-display mt-1 text-3xl italic">Réservé aux licenciés</h1>
        <p className="mx-auto mt-3 max-w-md text-[13.5px] text-encre-douce">
          Cette page est réservée aux licenciés du club, connectés avec leur adresse autorisée.
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

  const [{ saison: saisonDemandee }, saisons, saisonActive] = await Promise.all([
    searchParams,
    getSaisons(),
    getSaisonActive(),
  ]);
  const saison = saisonDemandee ?? saisonActive;
  const manifestations = await getManifestations(saison);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">SAISON {saison}</p>
          <h1 className="font-display mt-1 text-4xl italic">Manifestations</h1>
        </div>
        <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
      </header>

      {manifestations.length === 0 ? (
        <p className="text-[14px] text-encre-douce">Aucune manifestation enregistrée pour cette saison.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {manifestations.map((m) => (
            <Link
              key={m.id}
              href={`/manifestations/${m.id}`}
              className="flex flex-col gap-2 rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)] transition-transform hover:-translate-y-0.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[16px]">{m.nom}</span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                      STATUT_COULEUR[m.statut] ?? 'bg-encre-douce/15 text-encre-douce'
                    }`}
                  >
                    {m.statut}
                  </span>
                </div>
                {m.type && <p className="mt-0.5 text-[12.5px] text-encre-douce">{m.type}</p>}
              </div>
              <div className="flex flex-col gap-1 text-[12.5px] text-encre-douce sm:items-end">
                <span className="flex items-center gap-1.5">
                  <CalendarDays size={14} />
                  {m.dateDebut === m.dateFin
                    ? new Date(m.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
                    : `${new Date(m.dateDebut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} – ${new Date(m.dateFin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                </span>
                {m.lieu && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} />
                    {m.lieu}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
