import type { Metadata } from 'next';
import Link from 'next/link';
import { HeartHandshake, CalendarDays, ChevronRight } from 'lucide-react';
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

  /** Une entrée par manifestation (retour Jérôme, 26/07/2026 : d'abord
   *  choisir la manifestation via sa date, puis seulement entrer dans le
   *  détail des postes à pourvoir — pas tout à plat d'un coup). Date
   *  affichée = la plus proche parmi ses créneaux à pourvoir. */
  const parManifestation = new Map<
    number,
    { nom: string; dateMin: string; postesRestants: number }
  >();
  creneaux.forEach((c) => {
    const postesRestants = c.postesPrevus - c.affectations.length;
    const existant = parManifestation.get(c.manifestationId);
    if (existant) {
      existant.postesRestants += postesRestants;
      if (c.date < existant.dateMin) existant.dateMin = c.date;
    } else {
      parManifestation.set(c.manifestationId, {
        nom: c.manifestationNom,
        dateMin: c.date,
        postesRestants,
      });
    }
  });
  const manifestations = Array.from(parManifestation.entries()).sort(
    (a, b) => a[1].dateMin.localeCompare(b[1].dateMin)
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header className="entree mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">BÉNÉVOLAT</p>
          <h1 className="font-display mt-1 text-4xl italic">Se déclarer bénévole</h1>
          <p className="mt-3 max-w-md text-[13.5px] text-encre-douce">
            Les manifestations à venir où il manque encore du monde. Clique sur une manifestation pour voir
            les postes disponibles.
          </p>
        </div>
        <Link
          href="/benevole/moi"
          className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-4 py-2 text-[13px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta"
        >
          <HeartHandshake size={15} />
          Mes participations
        </Link>
      </header>

      {manifestations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-ligne bg-sable-carte px-5 py-12 text-center">
          <HeartHandshake size={28} className="text-pin" />
          <p className="text-[14px] text-encre-douce">
            Tous les postes sont pourvus pour le moment — merci aux bénévoles déjà inscrits !
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {manifestations.map(([manifestationId, m]) => (
            <Link
              key={manifestationId}
              href={`/benevole/${manifestationId}`}
              className="flex items-center justify-between gap-3 rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)] transition-transform hover:-translate-y-0.5"
            >
              <div>
                <span className="font-display text-[16px]">{m.nom}</span>
                <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-encre-douce">
                  <CalendarDays size={14} />
                  {new Date(m.dateMin).toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-terracotta/10 px-2.5 py-0.5 text-[12px] font-medium text-terracotta">
                  {m.postesRestants} poste{m.postesRestants > 1 ? 's' : ''} à pourvoir
                </span>
                <ChevronRight size={16} className="text-encre-douce" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
