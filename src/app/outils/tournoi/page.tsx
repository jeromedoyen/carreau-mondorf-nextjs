import type { Metadata } from 'next';
import Link from 'next/link';
import { Swords, Users, MapPin, Trophy } from 'lucide-react';
import { estMembreCA } from '@/lib/membres';
import { getTournois } from '@/lib/tournoi/donnees';
import { NouveauTournoiForm } from '@/components/NouveauTournoiForm';

export const metadata: Metadata = { title: 'Tournois' };

const LIBELLE_FORMAT: Record<string, string> = {
  equipes_fixes: 'Équipes fixes',
  melee: 'À la mêlée',
};
const LIBELLE_TAILLE: Record<number, string> = {
  1: 'Tête-à-tête',
  2: 'Doublettes',
  3: 'Triplettes',
};
const LIBELLE_STATUT: Record<string, { texte: string; classe: string }> = {
  preparation: { texte: 'En préparation', classe: 'bg-sable text-encre-douce' },
  en_cours: { texte: 'En cours', classe: 'bg-laiton/20 text-[#7a5c1f]' },
  termine: { texte: 'Terminé', classe: 'bg-pin/12 text-pin' },
};

function formaterDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default async function TournoisPage() {
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

  const tournois = await getTournois();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-8">
        <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">RÉSERVÉ AU CA</p>
        <h1 className="font-display mt-1 text-4xl italic">Tournois</h1>
        <p className="mt-2 max-w-lg text-[13px] text-encre-douce">
          Conduire un concours du club de bout en bout : composition des équipes, tirage des
          rencontres partie après partie, saisie des scores et classement. Deux formats — équipes
          fixes au système suisse, ou à la mêlée avec équipes retirées au sort à chaque partie.
        </p>
      </header>

      <NouveauTournoiForm />

      {tournois.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-ligne px-5 py-10 text-center text-[13.5px] text-encre-douce">
          Aucun tournoi pour l&apos;instant.
        </p>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {tournois.map((t) => {
            const statut = LIBELLE_STATUT[t.statut];
            return (
              <li key={t.id}>
                <Link
                  href={`/outils/tournoi/${t.id}`}
                  className="entree block rounded-2xl border border-ligne bg-sable-carte p-5 transition-colors hover:border-terracotta"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-display text-[19px]">{t.nom}</h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statut.classe}`}
                    >
                      {statut.texte}
                    </span>
                  </div>
                  <p className="mt-1 text-[12.5px] text-encre-douce first-letter:uppercase">
                    {formaterDate(t.dateTournoi)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px] text-encre-douce">
                    <span className="inline-flex items-center gap-1.5">
                      <Swords size={13} /> {LIBELLE_FORMAT[t.format]}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={13} /> {LIBELLE_TAILLE[t.tailleEquipe]}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Trophy size={13} /> {t.nbParties} parties en {t.pointsVictoire} points
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={13} /> {t.nbTerrains} terrains
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
