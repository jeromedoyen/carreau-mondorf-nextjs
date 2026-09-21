import type { LucideIcon } from 'lucide-react';

/* Une carte d'indicateur. Le chiffre est en Bebas (`font-score`), la police
 * de tableau d'affichage déjà utilisée partout ailleurs pour les scores —
 * c'est ce qui donne au bandeau son air de panneau de boulodrome plutôt
 * que de tableau de bord SaaS.
 *
 * Pas de couleur d'alerte ici : un taux de victoire bas n'est pas une
 * erreur système, et le rouge sur un résultat sportif culpabilise sans rien
 * apprendre. Les nuances disponibles sont neutres (`encre`) ou positives
 * (`pin`, `terracotta`), jamais accusatrices. */

export type TeinteKPI = 'neutre' | 'accent' | 'positif';

const TEINTES: Record<TeinteKPI, string> = {
  neutre: 'text-encre',
  accent: 'text-terracotta',
  positif: 'text-pin',
};

export function CarteKPI({
  icone: Icone,
  valeur,
  suffixe,
  libelle,
  aide,
  teinte = 'neutre',
}: {
  icone: LucideIcon;
  /** Déjà formatée par l'appelant — ce composant ne décide pas des
   *  arrondis, qui dépendent de l'indicateur. */
  valeur: string;
  suffixe?: string;
  libelle: string;
  /** Une ligne d'explication, affichée sous le libellé. Préférée au tooltip :
   *  lisible au toucher comme au clavier, sans interaction. */
  aide?: string;
  teinte?: TeinteKPI;
}) {
  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-4 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      <Icone size={15} className="mb-2 text-encre-douce/50" aria-hidden="true" />
      <p className={`font-score text-[26px] leading-none ${TEINTES[teinte]}`}>
        {valeur}
        {suffixe && <span className="ml-0.5 text-[15px]">{suffixe}</span>}
      </p>
      <p className="mt-1.5 text-[10.5px] uppercase leading-tight tracking-wide text-encre-douce/70">
        {libelle}
      </p>
      {aide && <p className="mt-1 text-[11px] leading-snug text-encre-douce/60">{aide}</p>}
    </div>
  );
}
