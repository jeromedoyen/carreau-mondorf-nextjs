import type { Metadata } from 'next';
import Link from 'next/link';
import { estMembreCA } from '@/lib/membres';
import { getSaisonActive } from '@/lib/saisons';
import { getMembresARenouveler } from '@/lib/renouvellement';
import { LancerRenouvellementBouton } from '@/components/LancerRenouvellementBouton';

export const metadata: Metadata = { title: 'Renouvellement' };

export default async function RenouvellementPage() {
  const ca = await estMembreCA();

  if (!ca) {
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

  // La saison "active" (saisons.active) est celle EN COURS, pas celle vers
  // laquelle on renouvelle — retour Jérôme, 28/07/2026 : tant que 2026 est
  // active, l'outil doit préparer le basculement 2026 -> 2027, pas
  // reproposer 2025 -> 2026 (déjà fait). Toujours saison active -> suivante.
  const anneePrecedente = await getSaisonActive();
  const anneeCible = String(Number(anneePrecedente) + 1);
  const membres = await getMembresARenouveler(anneePrecedente, anneeCible);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">OUTILS</p>
        <h1 className="font-display mt-1 text-4xl italic">Renouvellement {anneeCible}</h1>
        <p className="mt-3 text-[13.5px] text-encre-douce">
          Membres de la saison {anneePrecedente} qui n&apos;ont pas encore d&apos;adhésion {anneeCible} et
          disposent déjà d&apos;un accès de connexion. Chacun reçoit un email avec un lien vers le formulaire
          de réinscription — rien n&apos;est recopié automatiquement, la personne confirme ses informations
          elle-même.
        </p>
      </header>

      <div className="mb-6 rounded-2xl border border-ligne bg-sable-carte p-5">
        <LancerRenouvellementBouton annee={anneeCible} nombre={membres.length} />
      </div>

      {membres.length === 0 ? (
        <p className="text-[13.5px] text-encre-douce">
          Aucun membre en attente de renouvellement pour {anneeCible}.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-2">
            {membres.map((m) => (
              <li
                key={m.personneId}
                className="rounded-xl border border-ligne bg-sable-carte px-4 py-2.5 text-[13.5px]"
              >
                <span className="text-encre">
                  {m.prenom} {m.nom}
                </span>
                <span className="ml-2 text-encre-douce">{m.email}</span>
              </li>
            ))}
          </ul>
          {/* Total exact en bas de liste — retour Jérôme (note vocale #129,
              07/08/2026) : le compte n'était visible qu'implicitement en
              recomptant la liste à l'œil. */}
          <p className="mt-4 text-[13px] font-medium text-encre-douce">
            {membres.length} membre{membres.length > 1 ? 's' : ''} à renouveler au total.
          </p>
        </>
      )}
    </main>
  );
}
