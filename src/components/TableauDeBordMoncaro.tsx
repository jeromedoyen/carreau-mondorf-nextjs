import Link from 'next/link';
import { HeartHandshake, Trophy, Euro } from 'lucide-react';
import { CarteCotisationMoncaro } from './CarteCotisationMoncaro';
import type { MonAdhesion } from '@/lib/moncaro';
import type { ParametresClub } from '@/lib/paiements';
import type { TableauDeBordBenevole } from '@/lib/benevolat';
import type { StatJoueurD2, StatistiquesPromotion } from '@/lib/types';

type MaParticipationConcours = {
  id: number;
  type: string;
  statut: string;
  montant_final: number | null;
};

const LIBELLE_TYPE_CONCOURS: Record<string, string> = {
  Championnat_D2: 'National D2',
  Promotion: 'Promotion',
  Concours_National: 'Championnat national',
  Concours: 'Concours',
};

function sansAccents(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function TableauDeBordMoncaro({
  saison,
  adhesion,
  parametres,
  benevolat,
  statsVisibles,
  monNom,
  mesStatsD2,
  statsPromotion,
  participationsConcours,
}: {
  saison: string;
  adhesion: MonAdhesion | null;
  parametres: ParametresClub | null;
  benevolat: TableauDeBordBenevole | null;
  statsVisibles: boolean;
  monNom: string | null;
  mesStatsD2: StatJoueurD2 | null;
  statsPromotion: StatistiquesPromotion | null;
  participationsConcours: MaParticipationConcours[];
}) {
  const monEntreePromotion =
    monNom && statsPromotion ? statsPromotion.joueurs.find((j) => sansAccents(j.nom) === sansAccents(monNom)) : null;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <CarteCotisationMoncaro saison={saison} monNom={monNom} adhesion={adhesion} parametres={parametres} />

      <div className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <div className="mb-3 flex items-center gap-2">
          <HeartHandshake size={16} className="text-pin" />
          <h2 className="font-display text-[15px]">Bénévolat</h2>
        </div>
        {benevolat && benevolat.total > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-score text-xl">{benevolat.total}</div>
                <div className="text-[10.5px] uppercase tracking-wide text-encre-douce/70">total</div>
              </div>
              <div>
                <div className="font-score text-xl">{benevolat.totalAVenir}</div>
                <div className="text-[10.5px] uppercase tracking-wide text-encre-douce/70">à venir</div>
              </div>
              <div>
                <div className="font-score text-xl">{benevolat.heuresTotal}h</div>
                <div className="text-[10.5px] uppercase tracking-wide text-encre-douce/70">cumulées</div>
              </div>
            </div>
            <Link href="/benevole/moi" className="mt-1 text-[12.5px] text-terracotta hover:underline">
              Voir le détail →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-encre-douce">Aucune participation enregistrée pour l&apos;instant.</p>
            <Link href="/benevole" className="text-[12.5px] text-terracotta hover:underline">
              Voir les postes à pourvoir →
            </Link>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <div className="mb-3 flex items-center gap-2">
          <Euro size={16} className="text-pin" />
          <h2 className="font-display text-[15px]">Concours &amp; remboursements</h2>
        </div>
        {participationsConcours.length > 0 ? (
          <div className="flex flex-col gap-2">
            {participationsConcours.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-[13px] text-encre">
                <span>{LIBELLE_TYPE_CONCOURS[p.type] ?? p.type}</span>
                <span className="flex items-center gap-2">
                  <span className="font-score text-terracotta">
                    {p.montant_final != null ? `${p.montant_final.toFixed(2)} €` : '—'}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10.5px] ${
                      p.statut === 'paye'
                        ? 'bg-pin/10 text-pin'
                        : p.statut === 'valide'
                          ? 'bg-marine/10 text-marine'
                          : 'bg-sable text-encre-douce'
                    }`}
                  >
                    {p.statut === 'paye' ? 'Payé' : p.statut === 'valide' ? 'Validé' : 'En attente'}
                  </span>
                </span>
              </div>
            ))}
            <Link href="/concours" className="mt-1 text-[12.5px] text-terracotta hover:underline">
              Voir le détail →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[13px] text-encre-douce">Aucune participation enregistrée pour l&apos;instant.</p>
            <Link href="/concours" className="text-[12.5px] text-terracotta hover:underline">
              Déclarer un concours →
            </Link>
          </div>
        )}
      </div>

      {statsVisibles && (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
          <div className="mb-3 flex items-center gap-2">
            <Trophy size={16} className="text-pin" />
            <h2 className="font-display text-[15px]">Compétition</h2>
          </div>
          <div className="flex flex-col gap-2.5">
            {mesStatsD2 ? (
              <Link
                href="/national-d2"
                className="flex items-center justify-between text-[13px] text-encre hover:text-terracotta"
              >
                <span>National D2 — {mesStatsD2.joues} partie(s)</span>
                <span className="font-score text-base text-terracotta">
                  {Math.round(mesStatsD2.tauxVictoire * 100)}%
                </span>
              </Link>
            ) : (
              <p className="text-[12.5px] text-encre-douce">National D2 — aucune partie cette saison.</p>
            )}
            {monEntreePromotion ? (
              <Link
                href="/promotion"
                className="flex items-center justify-between text-[13px] text-encre hover:text-terracotta"
              >
                <span>Promotion — {monEntreePromotion.participations} journée(s)</span>
                <span className="font-score text-base text-terracotta">
                  {Math.round(monEntreePromotion.tauxVictoire * 100)}%
                </span>
              </Link>
            ) : (
              <p className="text-[12.5px] text-encre-douce">Promotion — aucune journée cette saison.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
