import type { Metadata } from 'next';
import { CalendrierD2 } from '@/components/CalendrierD2';
import { ClassementView } from '@/components/ClassementView';
import { StatistiquesD2 } from '@/components/StatistiquesD2';
import { SaisonSwitcher } from '@/components/SaisonSwitcher';
import { SectionToggle } from '@/components/SectionToggle';
import { PropositionEquipeIA } from '@/components/PropositionEquipeIA';
import { getClassementDivisionD2, getRencontresD2 } from '@/lib/data';
import { getSaisons, getSaisonActive, divisionDeSaison } from '@/lib/saisons';

export const metadata: Metadata = { title: 'Championnat national' };

/* Cette page s'appelait /national-d2. Le club monte en National D1 en 2027 :
 * la route est devenue /national (redirections dans next.config.ts), et la
 * division n'est plus écrite en dur — c'est celle de la saison affichée
 * (`saisons.division_nationale`, migration 0069). Les composants et les
 * tables gardent leur nom « D2 » : ils portent le championnat national du
 * club, quelle que soit la division. */
export default async function NationalPage({
  searchParams,
}: {
  searchParams: Promise<{ saison?: string }>;
}) {
  const [{ saison: saisonDemandee }, saisons, saisonActive] = await Promise.all([
    searchParams,
    getSaisons(),
    getSaisonActive(),
  ]);
  const saison = saisonDemandee ?? saisonActive;
  const division = divisionDeSaison(saisons, saison);

  const [data, rencontres] = await Promise.all([
    getClassementDivisionD2(saison),
    getRencontresD2(saison),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-12">
      <header className="entree mb-9 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-score text-[13px] tracking-[0.2em] text-terracotta">
            SAISON {data.saison}
          </p>
          <h1 className="font-display mt-1 text-4xl italic">{division}</h1>
        </div>
        <SaisonSwitcher saisons={saisons.map((s) => s.libelle)} actuelle={saison} />
      </header>
      <SectionToggle
        calendrier={
          // PC : calendrier à gauche, classement à droite, visibles ensemble
          // (pense-bête Jérôme, 24/07/2026) — empilés en une colonne sur
          // mobile, où la largeur ne permet pas un affichage côte à côte lisible.
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start">
            <CalendrierD2 rencontres={rencontres} />
            <ClassementView data={data} division={division} />
          </div>
        }
        statistiques={<StatistiquesD2 saison={saison} />}
        propositionIA={<PropositionEquipeIA saison={saison} />}
      />
    </main>
  );
}
