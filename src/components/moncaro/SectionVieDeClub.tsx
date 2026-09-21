import Link from 'next/link';
import { CalendarClock, HeartHandshake, ReceiptText } from 'lucide-react';
import { Carte } from './Carte';
import { EtatVide } from './EtatVide';
import { CarteCotisationMoncaro } from '../CarteCotisationMoncaro';
import type { MonAdhesion } from '@/lib/moncaro';
import type { ParametresClub } from '@/lib/paiements';
import type { TableauDeBordBenevole } from '@/lib/benevolat';

export type MaParticipationConcours = {
  id: number;
  type: string;
  statut: string;
  montant_final: number | null;
  date: string | null;
  club: string | null;
};

const LIBELLE_TYPE_CONCOURS: Record<string, string> = {
  Championnat_D2: 'National D2',
  Promotion: 'Promotion',
  Concours_National: 'Championnat national',
  Concours: 'Concours',
};

const LIBELLE_STATUT: Record<string, string> = {
  paye: 'Payé',
  valide: 'Validé',
  a_clarifier: 'À préciser',
};

const CLASSE_STATUT: Record<string, string> = {
  paye: 'bg-pin/10 text-pin',
  valide: 'bg-marine/10 text-marine',
  a_clarifier: 'bg-laiton/15 text-encre',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

export function SectionVieDeClub({
  saison,
  monNom,
  adhesion,
  parametres,
  benevolat,
  participationsConcours,
  concoursVisible,
  consultation = false,
}: {
  saison: string;
  monNom: string | null;
  adhesion: MonAdhesion | null;
  parametres: ParametresClub | null;
  benevolat: TableauDeBordBenevole | null;
  participationsConcours: MaParticipationConcours[];
  /** Dans la vue du comité, cette carte n'apparaît que si l'appelant est à
   *  la trésorerie : la RLS de `participations_concours` (migration 0047)
   *  réserve les montants de remboursement à ce rôle, pas à tout le CA. */
  concoursVisible: boolean;
  consultation?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* Valorisant, jamais comptable : on montre ce qui a été donné au
          club, on ne note personne et on n'affiche aucun manque. */}
      <Carte
        titre={consultation ? 'Son engagement au club' : 'Mon engagement au club'}
        icone={HeartHandshake}
        enTeteSecondaire={`Saison ${saison}`}
        action={
          benevolat && benevolat.total > 0 ? (
            <Link
              href="/benevole/moi"
              className="rounded-lg px-1.5 py-0.5 text-[12.5px] text-terracotta hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
            >
              Tout voir →
            </Link>
          ) : undefined
        }
      >
        {benevolat && benevolat.total > 0 ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="font-score text-[24px] leading-none text-encre">{benevolat.total}</div>
                <div className="mt-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce/70">
                  créneaux
                </div>
              </div>
              <div>
                <div className="font-score text-[24px] leading-none text-pin">{benevolat.heuresTotal}h</div>
                <div className="mt-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce/70">
                  données
                </div>
              </div>
              <div>
                <div className="font-score text-[24px] leading-none text-terracotta">
                  {benevolat.totalAVenir}
                </div>
                <div className="mt-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce/70">
                  à venir
                </div>
              </div>
            </div>

            {benevolat.parCategorie.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {benevolat.parCategorie.map((c) => (
                  <li
                    key={c.categorie}
                    className="rounded-full bg-sable px-2.5 py-1 text-[11.5px] text-encre-douce"
                  >
                    {c.categorie} <span className="font-score text-encre">{c.nombre}</span>
                  </li>
                ))}
              </ul>
            )}

            {benevolat.aVenir.length > 0 && (
              <div className="border-t border-ligne pt-3.5">
                <p className="mb-2 flex items-center gap-1.5 text-[11.5px] uppercase tracking-wide text-encre-douce/70">
                  <CalendarClock size={12} aria-hidden="true" /> Prochains créneaux
                </p>
                <ul className="flex flex-col gap-1.5">
                  {benevolat.aVenir.slice(0, 3).map((p) => (
                    <li key={p.affectationId} className="flex items-center gap-3 text-[12.5px]">
                      <span className="w-12 shrink-0 whitespace-nowrap text-encre-douce">
                        {formatDate(p.date)}
                      </span>
                      <span className="min-w-0 truncate text-encre">{p.tache}</span>
                      <span className="ml-auto shrink-0 truncate text-[11.5px] text-encre-douce/70">
                        {p.manifestationNom}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <EtatVide
            icone={HeartHandshake}
            titre={`Aucun créneau tenu sur la saison ${saison}.`}
            detail="Le club fonctionne grâce aux coups de main : buvette, cuisine, table de marque, préparation."
            action={{ libelle: 'Voir les postes à pourvoir', href: '/benevole' }}
          />
        )}
      </Carte>

      {concoursVisible && (
        <Carte
          titre="Concours et remboursements"
          icone={ReceiptText}
          action={
            <Link
              href="/concours"
              className="rounded-lg px-1.5 py-0.5 text-[12.5px] text-terracotta hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
            >
              {participationsConcours.length > 0 ? 'Tout voir →' : 'Déclarer →'}
            </Link>
          }
        >
          {participationsConcours.length > 0 ? (
            <ul className="flex flex-col divide-y divide-ligne">
              {participationsConcours.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-12 shrink-0 whitespace-nowrap text-[12px] text-encre-douce">
                    {p.date ? formatDate(p.date) : '—'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-encre">
                    {LIBELLE_TYPE_CONCOURS[p.type] ?? p.type}
                    {p.club && <span className="text-encre-douce"> · {p.club}</span>}
                  </span>
                  <span className="font-score shrink-0 text-[13px] text-terracotta">
                    {p.montant_final != null ? `${p.montant_final.toFixed(2)} €` : '—'}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] ${
                      CLASSE_STATUT[p.statut] ?? 'bg-sable text-encre-douce'
                    }`}
                  >
                    {LIBELLE_STATUT[p.statut] ?? 'En attente'}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EtatVide
              icone={ReceiptText}
              titre="Aucune participation déclarée pour l'instant."
              detail="Les déplacements en concours peuvent être déclarés pour remboursement, à la voix ou au clavier."
              action={{ libelle: 'Déclarer un concours', href: '/concours' }}
            />
          )}
        </Carte>
      )}

      <CarteCotisationMoncaro
        saison={saison}
        monNom={monNom}
        adhesion={adhesion}
        parametres={parametres}
        consultation={consultation}
      />
    </div>
  );
}
