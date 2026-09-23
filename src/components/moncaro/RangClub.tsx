import Link from 'next/link';
import { ChevronRight, Trophy } from 'lucide-react';
import type { RangClub as RangClubData } from '@/lib/rangClub';
import { CLUB_CARREAU_MONDORF } from '@/lib/types';

/** Le chiffre en police d'affichage, le suffixe en texte courant : la
 *  police de score est en capitales, « 1ER » et « 8E » se liraient comme
 *  des fautes. */
function Ordinal({ n }: { n: number }) {
  return (
    <>
      <span className="font-score text-[22px] leading-none text-terracotta">{n}</span>
      <sup className="ml-px text-[11px] text-terracotta">{n === 1 ? 'er' : 'e'}</sup>
    </>
  );
}

/** La place du club dans un championnat, en tête de l'onglet correspondant
 *  du tableau de bord — « ajoute le rang du club dans /moncaro » (Jérôme,
 *  23/09/2026).
 *
 *  Toute la ligne mène au classement : le rang appelle la question « et les
 *  autres ? », et la réponse est à un clic. La précision (« classement
 *  final », « après la journée 12 ») est toujours écrite — un rang sans sa
 *  date se lit comme définitif. Ne rend rien quand le classement de la
 *  saison n'existe pas encore : mieux vaut l'absence qu'un « — sur — ». */
export function RangClub({
  championnat,
  rang,
  href,
}: {
  championnat: string;
  rang: RangClubData | null | undefined;
  href: string;
}) {
  if (!rang) return null;
  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-2xl border border-ligne bg-sable-carte px-5 py-4 shadow-[0_1px_3px_rgba(36,27,18,.04)] transition-colors hover:border-terracotta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
    >
      <Trophy size={18} className="shrink-0 text-laiton" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-[11px] uppercase tracking-wide text-encre-douce/70">
          {CLUB_CARREAU_MONDORF} en {championnat}
        </span>
        <span className="text-[15px] text-encre">
          <Ordinal n={rang.rang} />
          <span className="text-encre-douce"> sur {rang.nbClubs}</span>
          <span className="mx-2 text-encre-douce/40">·</span>
          <span className="font-score text-[15px]">{rang.points} pts</span>
        </span>
        <span className="text-[11.5px] text-encre-douce">{rang.precision}</span>
      </span>
      <ChevronRight
        size={15}
        className="shrink-0 text-encre-douce/40 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
