import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartHandshake } from 'lucide-react';
import { CreneauAffectations } from '@/components/CreneauAffectations';
import { getCreneauxAPourvoir, estUtilisateurAutorise } from '@/lib/manifestations';

export const metadata: Metadata = { title: 'Bénévole' };

export default async function BenevolePage() {
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

  const creneaux = await getCreneauxAPourvoir();

  const parManifestation = new Map<number, { nom: string; creneaux: typeof creneaux }>();
  creneaux.forEach((c) => {
    const groupe = parManifestation.get(c.manifestationId) ?? { nom: c.manifestationNom, creneaux: [] };
    groupe.creneaux.push(c);
    parManifestation.set(c.manifestationId, groupe);
  });

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-9">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">BÉNÉVOLAT</p>
        <h1 className="font-display mt-1 text-4xl italic">Se déclarer bénévole</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Toutes les tâches à venir où il manque encore du monde, tous événements confondus.
        </p>
      </header>

      {parManifestation.size === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-ligne bg-sable-carte px-5 py-12 text-center">
          <HeartHandshake size={28} className="text-pin" />
          <p className="text-[14px] text-encre-douce">
            Tous les postes sont pourvus pour le moment — merci aux bénévoles déjà inscrits !
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Array.from(parManifestation.entries()).map(([manifestationId, groupe]) => (
            <div key={manifestationId}>
              <div className="mb-2.5 flex items-center justify-between gap-3">
                <h2 className="font-display text-[16px]">{groupe.nom}</h2>
                <Link
                  href={`/manifestations/${manifestationId}`}
                  className="text-[12.5px] text-encre-douce hover:text-terracotta"
                >
                  Voir la manifestation →
                </Link>
              </div>
              <div className="flex flex-col gap-3">
                {groupe.creneaux.map((c) => (
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
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
