'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Trash2, Users } from 'lucide-react';
import { supprimerConge } from '@/lib/actions/conges';
import { MEMBRES_CA } from '@/lib/membresCA';
import type { Conge } from '@/lib/conges';

function formatPeriode(dateDebut: string, dateFin: string) {
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  const debut = new Date(dateDebut).toLocaleDateString('fr-FR', opts);
  if (dateDebut === dateFin) return debut;
  const fin = new Date(dateFin).toLocaleDateString('fr-FR', { ...opts, year: 'numeric' });
  return `${debut} – ${fin}`;
}

/** Couleurs de statut de congé — charte graphique v1 (Vacances = bleu,
 *  Indisponible ponctuel = ambre, Autre = gris), portées sur les tokens
 *  v2 les plus proches (marine/laiton/encre-douce). */
const COULEUR_MOTIF: Record<string, string> = {
  Vacances: 'bg-marine/15 text-marine',
  Indisponible: 'bg-laiton/20 text-laiton',
};

export function ListeConges({ conges }: { conges: Conge[] }) {
  const router = useRouter();

  async function supprimer(id: number) {
    await supprimerConge(id);
    router.refresh();
  }

  if (conges.length === 0) {
    return <p className="text-[14px] text-encre-douce">Aucun congé déclaré pour cette saison.</p>;
  }

  // Pense-bête 27/07/2026 : les congés déjà terminés (date de fin passée)
  // en fin de liste et grisés, plutôt que mélangés avec les congés en
  // cours/à venir — comparaison sur la date seule (pas l'heure), un congé
  // qui se termine "aujourd'hui" reste donc dans le premier groupe.
  const aujourdhui = new Date();
  aujourdhui.setHours(0, 0, 0, 0);
  const enCoursOuAVenir = conges.filter((c) => new Date(c.dateFin) >= aujourdhui);
  const termines = conges.filter((c) => new Date(c.dateFin) < aujourdhui);
  const congesOrdonnes = [...enCoursOuAVenir, ...termines];

  return (
    <div className="divide-y divide-ligne overflow-hidden rounded-2xl border border-ligne bg-sable-carte">
      {congesOrdonnes.map((c) => {
        const membre = MEMBRES_CA.find((m) => m.nom === c.personne);
        const termine = new Date(c.dateFin) < aujourdhui;
        return (
          <div
            key={c.id}
            className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 ${termine ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-ligne bg-sable">
                {membre?.photo ? (
                  <Image src={membre.photo} alt="" width={40} height={40} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Users size={16} className="text-encre-douce" />
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[14.5px]">{c.personne}</span>
                  {c.motif && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        COULEUR_MOTIF[c.motif] ?? 'bg-encre-douce/15 text-encre-douce'
                      }`}
                    >
                      {c.motif}
                    </span>
                  )}
                </div>
                {membre?.role && <p className="text-[11.5px] text-encre-douce/70">{membre.role}</p>}
                {c.note && <p className="mt-0.5 text-[12px] text-encre-douce">{c.note}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[13px] text-encre-douce">{formatPeriode(c.dateDebut, c.dateFin)}</span>
              <button
                type="button"
                onClick={() => supprimer(c.id)}
                aria-label={`Supprimer le congé de ${c.personne}`}
                className="text-encre-douce/60 hover:text-danger"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
