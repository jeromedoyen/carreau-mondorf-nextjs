import type { ReactElement } from 'react';
import { Tabs } from './Tabs';
import { EnTeteLicencie } from './moncaro/EnTeteLicencie';
import { BandeauKPI } from './moncaro/BandeauKPI';
import { BilanSportif } from './moncaro/BilanSportif';
import { SectionChampionnat } from './moncaro/SectionChampionnat';
import { SectionPromotion } from './moncaro/SectionPromotion';
import { SectionVieDeClub } from './moncaro/SectionVieDeClub';
import type { MaParticipationConcours } from './moncaro/SectionVieDeClub';
import type { MonAdhesion } from '@/lib/moncaro';
import type { ParametresClub } from '@/lib/paiements';
import type { TableauDeBordBenevole } from '@/lib/benevolat';
import type { StatistiquesPromotion, StatJoueurPromotion } from '@/lib/types';
import type { BilanSportifD2 } from '@/lib/tableauDeBord';
import type { RangClub } from '@/lib/rangClub';
import { calculerDistinctions, resumeSaison } from '@/lib/tableauDeBord';
import { cleNomJoueur } from '@/lib/normalisationTexte';

/* Assemblage du tableau de bord individuel.
 *
 * Les onglets évitent la page-fleuve : sur un téléphone, tout empiler
 * obligerait à défiler longuement avant d'atteindre la vie de club. Un
 * membre non-licencié ne voit que « Ma vie de club » — les autres onglets
 * ne seraient pas vides, ils seraient sans objet. */
export function TableauDeBordMoncaro({
  saison,
  adhesion,
  parametres,
  benevolat,
  statsVisibles,
  concoursVisible,
  monNom,
  bilan,
  statsPromotion,
  participationsConcours,
  entreePromotion,
  journeesPromotionSaison = null,
  rangNational = null,
  rangPromotion = null,
  consultation = false,
}: {
  saison: string;
  adhesion: MonAdhesion | null;
  parametres: ParametresClub | null;
  benevolat: TableauDeBordBenevole | null;
  statsVisibles: boolean;
  concoursVisible: boolean;
  monNom: string | null;
  bilan: BilanSportifD2 | null;
  statsPromotion: StatistiquesPromotion | null;
  participationsConcours: MaParticipationConcours[];
  /** Entrée Promotion déjà résolue par l'appelant. La vue du comité la
   *  fournit directement ; /moncaro la laisse vide et on la déduit du nom. */
  entreePromotion?: StatJoueurPromotion | null;
  /** Nombre de journées de Promotion de la saison, pour donner son
   *  dénominateur au bilan — voir SectionPromotion. */
  journeesPromotionSaison?: number | null;
  /** Place de Carreau Mondorf dans chaque championnat (`lib/rangClub.ts`). */
  rangNational?: RangClub | null;
  rangPromotion?: RangClub | null;
  /** Vue du comité sur la fiche d'un membre : libellés à la troisième
   *  personne, et le nom complet en titre plutôt qu'une salutation. */
  consultation?: boolean;
}) {
  // Rapprochement par clé insensible à l'ordre des mots : `promotion_equipes`
  // écrit « SCHMIT Marie-Louise » là où le registre donne « Marie-Louise
  // SCHMIT ». Une comparaison littérale ne trouvait jamais personne.
  const monEntreePromotion =
    entreePromotion !== undefined
      ? entreePromotion
      : monNom && statsPromotion
        ? (statsPromotion.joueurs.find((j) => cleNomJoueur(j.nom) === cleNomJoueur(monNom)) ?? null)
        : null;

  const sortiesPromotion = participationsConcours
    .filter((p) => p.type === 'Promotion')
    .map((p) => ({ id: p.id, date: p.date, club: p.club }));

  // Les sections sont passées à `Tabs` sous forme de tableau : chacune porte
  // donc sa clé, posée ici où l'élément est créé (React attribue l'absence
  // de clé au composant créateur, pas au consommateur).
  const vieDeClub = (
    <SectionVieDeClub
      key="vie-de-club"
      saison={saison}
      monNom={monNom}
      adhesion={adhesion}
      parametres={parametres}
      benevolat={benevolat}
      participationsConcours={participationsConcours}
      concoursVisible={concoursVisible}
      consultation={consultation}
    />
  );

  const onglets: { label: string; contenu: ReactElement }[] = statsVisibles
    ? [
        {
          label: consultation ? 'Saison' : 'Ma saison',
          contenu: <BilanSportif key="saison" bilan={bilan} consultation={consultation} />,
        },
        {
          label: 'Championnat',
          contenu: (
            <SectionChampionnat
              key="championnat"
              bilan={bilan}
              rangClub={rangNational}
              consultation={consultation}
            />
          ),
        },
        {
          label: 'Promotion',
          contenu: (
            <SectionPromotion
              key="promotion"
              saison={saison}
              entree={monEntreePromotion}
              sorties={sortiesPromotion}
              journeesSaison={journeesPromotionSaison}
              rangClub={rangPromotion}
              consultation={consultation}
            />
          ),
        },
        { label: consultation ? 'Vie de club' : 'Ma vie de club', contenu: vieDeClub },
      ]
    : [{ label: consultation ? 'Vie de club' : 'Ma vie de club', contenu: vieDeClub }];

  return (
    <div className="flex flex-col gap-6">
      <EnTeteLicencie
        nom={monNom}
        saison={saison}
        adhesion={adhesion}
        resume={statsVisibles ? resumeSaison(bilan) : null}
        distinctions={statsVisibles && bilan ? calculerDistinctions(bilan) : []}
        consultation={consultation}
      />

      <BandeauKPI bilan={statsVisibles ? bilan : null} engagementTotal={benevolat?.total ?? null} />

      {onglets.length > 1 ? (
        <Tabs labels={onglets.map((o) => o.label)}>{onglets.map((o) => o.contenu)}</Tabs>
      ) : (
        onglets[0].contenu
      )}
    </div>
  );
}
