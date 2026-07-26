import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CreneauAffectations } from '@/components/CreneauAffectations';
import { getCreneauxAPourvoir, estUtilisateurAutorise } from '@/lib/manifestations';

export const metadata: Metadata = { title: 'Postes à pourvoir' };

export default async function BenevoleManifestationPage({ params }: { params: Promise<{ id: string }> }) {
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
  const manifestationId = Number(id);
  const creneaux = (await getCreneauxAPourvoir()).filter((c) => c.manifestationId === manifestationId);
  if (creneaux.length === 0) notFound();
  const nomManifestation = creneaux[0].manifestationNom;

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/benevole" className="text-[13px] text-encre-douce hover:text-terracotta">
        ← Bénévole
      </Link>

      <header className="entree mt-4 mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">POSTES À POURVOIR</p>
        <h1 className="font-display mt-1 text-3xl italic">{nomManifestation}</h1>
      </header>

      <div className="flex flex-col gap-3">
        {creneaux.map((c) => (
          <div
            key={c.creneauId}
            className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-[15px]">{c.tache}</span>
                <span className="rounded-full bg-pin/10 px-2.5 py-0.5 text-[11px] font-medium text-pin">
                  {c.categorie}
                </span>
              </div>
              <span className="text-[12.5px] text-encre-douce">
                {new Date(c.date).toLocaleDateString('fr-FR', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
                {c.heureDebut && ` · ${c.heureDebut}${c.heureFin ? `–${c.heureFin}` : c.finImprecise ? '…' : ''}`}
              </span>
            </div>

            <CreneauAffectations
              manifestationId={manifestationId}
              creneauId={c.creneauId}
              affectations={c.affectations}
              postesPrevus={c.postesPrevus}
            />
          </div>
        ))}
      </div>
    </main>
  );
}
