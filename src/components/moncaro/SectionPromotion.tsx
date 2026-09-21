import { CalendarDays, MapPin, Medal } from 'lucide-react';
import { Carte } from './Carte';
import { EtatVide } from './EtatVide';
import { BarreProportion } from '../StatsCharts';
import type { StatJoueurPromotion } from '@/lib/types';

export type SortiePromotion = {
  id: number;
  date: string | null;
  club: string | null;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

/* Deux sources distinctes, et c'est tout le sujet de cette section :
 *
 *   promotion_equipes        -> les résultats, mais seulement jusqu'à 2025
 *   participations_concours  -> les sorties déclarées, 2026, sans résultat
 *
 * Quand on n'a que les secondes, on montre les sorties et on dit franchement
 * que les résultats ne sont pas saisis. On n'invente pas un taux de victoire
 * à partir d'une liste de déplacements. */
export function SectionPromotion({
  saison,
  entree,
  sorties,
}: {
  saison: string;
  /** Bilan chiffré du joueur, `null` si la saison n'a pas de résultats
   *  Promotion enregistrés. */
  entree: StatJoueurPromotion | null;
  sorties: SortiePromotion[];
}) {
  if (!entree && sorties.length === 0) {
    return (
      <Carte>
        <EtatVide
          icone={Medal}
          titre={`Aucune participation en Promotion pour la saison ${saison}.`}
          detail="Les journées de Promotion apparaissent ici dès qu'une participation est déclarée."
          action={{ libelle: 'Voir la Promotion', href: '/promotion' }}
        />
      </Carte>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {entree ? (
        <Carte
          titre="Mon bilan en Promotion"
          icone={Medal}
          enTeteSecondaire={`${entree.participations} ${entree.participations > 1 ? 'journées' : 'journée'}`}
        >
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="font-score text-[24px] leading-none text-encre">{entree.partiesJouees}</div>
              <div className="mt-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce/70">
                parties jouées
              </div>
            </div>
            <div>
              <div className="font-score text-[24px] leading-none text-pin">{entree.partiesGagnees}</div>
              <div className="mt-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce/70">
                gagnées
              </div>
            </div>
            <div>
              <div className="font-score text-[24px] leading-none text-terracotta">
                {Math.round(entree.tauxVictoire * 100)}%
              </div>
              <div className="mt-1.5 text-[10.5px] uppercase tracking-wide text-encre-douce/70">
                de victoires
              </div>
            </div>
          </div>
          <div className="mt-4">
            <BarreProportion victoires={entree.partiesGagnees} joues={entree.partiesJouees} />
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-encre-douce/80">
            En Promotion, le résultat est enregistré par équipe de trois, pas joueur par joueur : les
            parties gagnées du trio sont portées au crédit de chacun de ses membres.
          </p>
        </Carte>
      ) : (
        <Carte titre="Mon bilan en Promotion" icone={Medal}>
          <EtatVide
            icone={Medal}
            titre={`Les résultats de Promotion ne sont pas enregistrés pour la saison ${saison}.`}
            detail="Les feuilles de journée n'ont pas encore été saisies. Les sorties déclarées restent visibles ci-dessous."
          />
        </Carte>
      )}

      {sorties.length > 0 && (
        <Carte
          titre="Mes journées de Promotion"
          icone={CalendarDays}
          enTeteSecondaire={`${sorties.length} ${sorties.length > 1 ? 'sorties déclarées' : 'sortie déclarée'}`}
        >
          <ul className="flex flex-col divide-y divide-ligne">
            {sorties.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="w-12 shrink-0 whitespace-nowrap text-[12px] text-encre-douce">
                  {s.date ? formatDate(s.date) : '—'}
                </span>
                <MapPin size={12} className="shrink-0 text-encre-douce/50" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-encre">{s.club ?? '—'}</span>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </div>
  );
}
