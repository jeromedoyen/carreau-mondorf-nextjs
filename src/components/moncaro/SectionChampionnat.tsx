import Link from 'next/link';
import { ChevronRight, Home, Plane, Swords } from 'lucide-react';
import { Carte } from './Carte';
import { EtatVide } from './EtatVide';
import { IconeTypePartie } from '../StatsCharts';
import type { BilanSportifD2, RencontreDuJoueur } from '@/lib/tableauDeBord';

/** Même format court que le calendrier D2 (`CalendrierD2.tsx`), pour que
 *  les deux écrans se lisent pareil. */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function LigneRencontre({ r }: { r: RencontreDuJoueur }) {
  const gagneeParLEquipe =
    r.scoreRencontreCM !== null && r.scoreRencontreAdverse !== null
      ? r.scoreRencontreCM > r.scoreRencontreAdverse
      : null;

  return (
    <li>
      <Link
        href={`/national-d2/rencontres/${r.idRencontre}`}
        className="group flex flex-col gap-2.5 rounded-xl px-2 py-3 transition-colors hover:bg-sable focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta sm:flex-row sm:items-center sm:gap-4"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="font-score w-7 shrink-0 text-[13px] text-encre-douce/70">J{r.journee}</span>
          <span className="w-12 shrink-0 whitespace-nowrap text-[12px] text-encre-douce">
            {formatDate(r.date)}
          </span>
          <span className="shrink-0 text-encre-douce/50" title={r.domicile ? 'À domicile' : 'En déplacement'}>
            {r.domicile === null ? null : r.domicile ? (
              <Home size={12} aria-label="À domicile" />
            ) : (
              <Plane size={12} aria-label="En déplacement" />
            )}
          </span>
          <span className="min-w-0 truncate text-[13px] text-encre">{r.adversaireClub ?? '—'}</span>
        </span>

        <span className="flex shrink-0 items-center gap-3 pl-9 sm:pl-0">
          {r.scoreRencontreCM !== null && r.scoreRencontreAdverse !== null && (
            <span
              className={`font-score rounded-md px-2 py-0.5 text-[13px] ${
                gagneeParLEquipe ? 'bg-pin/10 text-pin' : 'bg-sable text-encre-douce'
              }`}
            >
              {r.scoreRencontreCM} – {r.scoreRencontreAdverse}
            </span>
          )}
          <span className="text-[12px] text-encre-douce">
            <span className="font-score text-[14px] text-encre">{r.victoires}</span>/{r.joues} parties
          </span>
          <ChevronRight
            size={14}
            className="shrink-0 text-encre-douce/40 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </Link>

      <ul className="flex flex-wrap gap-1.5 pb-2 pl-2 sm:pl-11">
        {r.parties.map((p) => (
          <li
            key={`${p.phase}-${p.type}-${p.ordre ?? 0}`}
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] ${
              p.gagne ? 'bg-pin/10 text-pin' : 'bg-sable text-encre-douce'
            }`}
          >
            <IconeTypePartie type={p.type} />
            <span>
              {p.scoreCM}–{p.scoreAdverse}
            </span>
            {/* Le mot double la couleur : l'information ne doit jamais
                tenir au seul vert. */}
            <span className="sr-only sm:not-sr-only">{p.gagne ? 'gagnée' : 'perdue'}</span>
          </li>
        ))}
      </ul>
    </li>
  );
}

export function SectionChampionnat({ bilan }: { bilan: BilanSportifD2 | null }) {
  if (!bilan || bilan.rencontres.length === 0) {
    return (
      <Carte>
        <EtatVide
          icone={Swords}
          titre="Aucune rencontre de championnat cette saison."
          detail="Cette page recense les rencontres de National D2 auxquelles tu as pris part."
          action={{ libelle: 'Voir le calendrier', href: '/national-d2' }}
        />
      </Carte>
    );
  }

  return (
    <Carte
      titre="Mes rencontres de National D2"
      icone={Swords}
      enTeteSecondaire={`${bilan.rencontres.length} ${bilan.rencontres.length > 1 ? 'rencontres' : 'rencontre'} · ${bilan.victoires}/${bilan.joues} parties gagnées`}
    >
      <ul className="flex flex-col divide-y divide-ligne">
        {bilan.rencontres.map((r) => (
          <LigneRencontre key={r.idRencontre} r={r} />
        ))}
      </ul>
    </Carte>
  );
}
