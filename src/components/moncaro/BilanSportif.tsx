import { Flame, Home, LineChart, PieChart, Plane, Users } from 'lucide-react';
import { Carte } from './Carte';
import { EtatVide } from './EtatVide';
import { AnneauVictoires } from './AnneauVictoires';
import { BarreProportion, GraphiquePointsParJournee, IconeTypePartie } from '../StatsCharts';
import type { BilanSportifD2 } from '@/lib/tableauDeBord';

const pourcent = (v: number) => `${Math.round(v * 100)} %`;

export function BilanSportif({
  bilan,
  consultation = false,
}: {
  bilan: BilanSportifD2 | null;
  /** Vue du comité sur la fiche d'un membre : les libellés passent de la
   *  première personne à la troisième. */
  consultation?: boolean;
}) {
  if (!bilan || bilan.joues === 0) {
    return (
      <Carte>
        <EtatVide
          icone={PieChart}
          titre="Aucune partie enregistrée pour cette saison."
          detail="Le bilan se remplit au fil des feuilles de match saisies par le comité, après chaque journée de championnat."
          action={{ libelle: 'Voir le championnat', href: '/national-d2' }}
        />
      </Carte>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <Carte titre="Victoires et défaites" icone={PieChart}>
          <AnneauVictoires victoires={bilan.victoires} defaites={bilan.defaites} />
          {bilan.meilleureSerie >= 2 && (
            <p className="mt-4 flex items-center gap-1.5 border-t border-ligne pt-3 text-[12.5px] text-encre-douce">
              <Flame size={13} className="shrink-0 text-terracotta" aria-hidden="true" />
              Meilleure série : <strong className="font-score text-[14px] text-encre">{bilan.meilleureSerie}</strong>{' '}
              victoires d&apos;affilée
            </p>
          )}
        </Carte>

        <Carte
          titre="Points par journée"
          icone={LineChart}
          enTeteSecondaire={`${bilan.pointsTotal} points sur la saison`}
        >
          {bilan.pointsParJournee.length > 1 ? (
            <>
              <GraphiquePointsParJournee donnees={bilan.pointsParJournee} />
              {/* Les mêmes valeurs, lisibles au lecteur d'écran : le
                  graphique ci-dessus est interactif à la souris et au
                  toucher, ce tableau le rend consultable autrement. */}
              <table className="sr-only">
                <caption>Points marqués par journée de championnat</caption>
                <thead>
                  <tr>
                    <th scope="col">Journée</th>
                    <th scope="col">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {bilan.pointsParJournee.map((d) => (
                    <tr key={d.journee}>
                      <th scope="row">Journée {d.journee}</th>
                      <td>{d.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <p className="py-4 text-[12.5px] text-encre-douce">
              Une seule journée jouée — l&apos;évolution apparaîtra à partir de la deuxième.
            </p>
          )}
        </Carte>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Carte titre="Par format de jeu" icone={Users}>
          <ul className="flex flex-col gap-3.5">
            {bilan.parType.map((t) => (
              <li key={t.type}>
                <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
                  <span className="flex items-center gap-1.5 text-encre">
                    <span className="text-encre-douce/60">
                      <IconeTypePartie type={t.type} />
                    </span>
                    {t.type}
                  </span>
                  <span className="text-encre-douce">
                    {t.victoires}/{t.joues} · {pourcent(t.tauxVictoire)}
                  </span>
                </div>
                <BarreProportion victoires={t.victoires} joues={t.joues} />
              </li>
            ))}
          </ul>
        </Carte>

        <Carte titre="Domicile et extérieur" icone={Home}>
          {bilan.parCamp.length > 0 ? (
            <ul className="flex flex-col gap-3.5">
              {bilan.parCamp.map((c) => (
                <li key={c.camp}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-[12.5px]">
                    <span className="flex items-center gap-1.5 text-encre">
                      {c.camp === 'domicile' ? (
                        <Home size={12} className="text-encre-douce/60" aria-hidden="true" />
                      ) : (
                        <Plane size={12} className="text-encre-douce/60" aria-hidden="true" />
                      )}
                      {c.camp === 'domicile' ? 'Au boulodrome' : 'En déplacement'}
                    </span>
                    <span className="text-encre-douce">
                      {c.victoires}/{c.joues} · {pourcent(c.tauxVictoire)}
                    </span>
                  </div>
                  <BarreProportion victoires={c.victoires} joues={c.joues} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-4 text-[12.5px] text-encre-douce">
              Le camp n&apos;est pas renseigné sur ces rencontres.
            </p>
          )}
        </Carte>
      </div>

      {bilan.partenaires.length > 0 && (
        <Carte
          titre={consultation ? 'Ses partenaires de jeu' : 'Avec qui tu joues'}
          icone={Users}
          enTeteSecondaire="Doublettes et triplettes uniquement"
        >
          <ul className="flex flex-col divide-y divide-ligne">
            {bilan.partenaires.slice(0, 6).map((p) => (
              <li key={p.nom} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <span className="min-w-0 truncate text-[13px] text-encre">{p.nom}</span>
                <span className="shrink-0 text-[12.5px] text-encre-douce">
                  {p.joues} {p.joues > 1 ? 'parties' : 'partie'} ·{' '}
                  <span className="font-score text-[14px] text-terracotta">{pourcent(p.tauxVictoire)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Carte>
      )}
    </div>
  );
}
