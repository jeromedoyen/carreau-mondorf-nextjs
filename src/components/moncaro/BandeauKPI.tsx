import { CalendarCheck, HeartHandshake, Percent, Swords, Target, Trophy } from 'lucide-react';
import { CarteKPI } from './CarteKPI';
import type { BilanSportifD2 } from '@/lib/tableauDeBord';

/* Le bandeau ne montre que ce qui est calculable. Chaque indicateur absent
 * disparaît au lieu de s'afficher à zéro : sans rencontre de référence, un
 * taux de présence de 0 % serait un mensonge, pas une information. */
export function BandeauKPI({
  bilan,
  engagementTotal,
}: {
  bilan: BilanSportifD2 | null;
  /** Nombre de créneaux bénévoles tenus sur la saison. `null` si le bilan
   *  bénévole n'a pas pu être chargé. */
  engagementTotal: number | null;
}) {
  const cartes = [];

  if (bilan && bilan.joues > 0) {
    cartes.push(
      <CarteKPI key="joues" icone={Swords} valeur={String(bilan.joues)} libelle="Parties jouées" />,
      <CarteKPI
        key="gagnees"
        icone={Trophy}
        valeur={String(bilan.victoires)}
        libelle="Parties gagnées"
        teinte="positif"
      />,
      <CarteKPI
        key="taux"
        icone={Percent}
        valeur={String(Math.round(bilan.tauxVictoire * 100))}
        suffixe="%"
        libelle="Taux de victoire"
        teinte="accent"
      />,
      <CarteKPI
        key="points"
        icone={Target}
        valeur={String(bilan.pointsTotal)}
        libelle="Points marqués"
        aide="Barème FLBP"
      />
    );

    if (bilan.tauxPresence !== null && bilan.rencontresEquipe !== null) {
      cartes.push(
        <CarteKPI
          key="presence"
          icone={CalendarCheck}
          valeur={String(bilan.journeesJouees)}
          suffixe={`/${bilan.rencontresEquipe}`}
          libelle="Présence en équipe"
          aide="Rencontres disputées"
        />
      );
    }
  }

  if (engagementTotal !== null && engagementTotal > 0) {
    cartes.push(
      <CarteKPI
        key="engagement"
        icone={HeartHandshake}
        valeur={String(engagementTotal)}
        libelle="Créneaux tenus"
        aide="Vie du club"
        teinte="positif"
      />
    );
  }

  if (cartes.length === 0) return null;

  return (
    <section aria-label="Indicateurs de la saison" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cartes}
    </section>
  );
}
