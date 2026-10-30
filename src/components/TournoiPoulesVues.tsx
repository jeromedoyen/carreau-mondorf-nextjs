'use client';

import { useState } from 'react';
import { Check, Shuffle } from 'lucide-react';
import { cloturerTournoi, enregistrerClubsEquipes, rouvrirTournoi, tirerLesPoules } from '@/lib/actions/tournoi';
import type { PartieDetail, Tournoi } from '@/lib/tournoi/donnees';
import type { VuePoules } from '@/lib/tournoi/poulesDonnees';
import { DocumentPoules, DocumentResultatsPoules, type DonneesPdf } from './TournoiPdf';
import { BTN, BoutonPdf, CHAMP, Carte, nomFichier, type Lancer } from './TournoiUi';

type EquipePermanente = { id: number; numero: number; membres: number[] };

/** « Poule A », « Tableau principal »… : le vocabulaire est celui du concours de boules, pas du code. */
export function ExplicationPoules({ vue }: { vue: Pick<VuePoules, 'mode' | 'taille' | 'qualifies' | 'consolante'> }) {
  return (
    <div className="rounded-xl border border-ligne bg-sable px-4 py-3 text-[12.5px] leading-relaxed text-encre-douce">
      <p className="mb-1 font-medium text-encre">Comment se déroule ce concours</p>
      <ol className="list-decimal space-y-0.5 pl-5">
        <li>
          Les équipes sont réparties en <b className="text-encre">poules</b> de {vue.mode === 'repechage' ? '3 ou 4' : `${Math.max(3, vue.taille - 1)} à ${vue.taille}`} équipes,
          en évitant de réunir deux équipes du même club.
        </li>
        <li>
          {vue.mode === 'repechage' ? (
            <>
              Chaque poule de 4 se joue <b className="text-encre">à repêchage</b> : 1-2 et 3-4, puis les gagnants entre eux et les perdants entre eux, puis
              un barrage. <b className="text-encre">2 équipes</b> par poule se qualifient (une poule de 3 se joue en toutes rondes).
            </>
          ) : (
            <>
              Chaque poule se joue en <b className="text-encre">toutes rondes</b> : chacun rencontre chacun une fois.{' '}
              <b className="text-encre">{vue.qualifies} équipe{vue.qualifies > 1 ? 's' : ''}</b> par poule se qualifie{vue.qualifies > 1 ? 'nt' : ''}.
            </>
          )}
        </li>
        <li>
          Les qualifiés jouent le <b className="text-encre">tableau principal</b> à élimination directe
          {vue.consolante ? (
            <>
              ; les équipes éliminées en poule jouent la <b className="text-encre">consolante</b>.
            </>
          ) : (
            '.'
          )}
        </li>
      </ol>
    </div>
  );
}

// ------------------------------------------------------------ onglet Poules

export function VuePoulesOnglet({
  tournoi,
  vue,
  equipesPermanentes,
  membresDe,
  nbPartiesComposees,
  enCours,
  lancer,
  donneesPdf,
}: {
  tournoi: Tournoi;
  vue: VuePoules;
  equipesPermanentes: EquipePermanente[];
  membresDe: (id: number) => string;
  nbPartiesComposees: number;
  enCours: boolean;
  lancer: Lancer;
  donneesPdf: DonneesPdf;
}) {
  const demarre = nbPartiesComposees > 0;
  const [clubs, setClubs] = useState<Record<number, string>>(() =>
    Object.fromEntries(equipesPermanentes.map((e) => [e.id, vue.clubsSaisis[e.id] ?? ''])),
  );
  const clubsModifies = equipesPermanentes.some((e) => (clubs[e.id] ?? '') !== (vue.clubsSaisis[e.id] ?? ''));

  if (equipesPermanentes.length < 3) {
    return (
      <section className="flex flex-col gap-5">
        <ExplicationPoules vue={vue} />
        <Carte titre="Poules">
          <p className="text-[13px] text-encre-douce">
            Composez d&apos;abord les équipes dans l&apos;onglet « Participants » (il en faut au moins 3). Les poules sont ensuite tirées au
            sort ici.
          </p>
        </Carte>
      </section>
    );
  }

  const tirage = vue.poules.length > 0;

  return (
    <section className="flex flex-col gap-5">
      <ExplicationPoules vue={vue} />

      {!demarre && (
        <Carte titre="Club de chaque équipe (facultatif)">
          <p className="mb-3 text-[12.5px] text-encre-douce">
            Sert au seul tirage : deux équipes du même club ne sont réunies dans une poule que si c&apos;est inévitable. Une équipe composée
            uniquement de licenciés du club est reconnue d&apos;elle-même. Laissez vide si vous ne savez pas.
          </p>
          <ul className="flex flex-col divide-y divide-ligne">
            {equipesPermanentes.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-2">
                <span className="font-score w-7 text-[15px] text-terracotta">{e.numero}</span>
                <span className="min-w-0 flex-1 basis-48 break-words text-[13px]">{membresDe(e.id)}</span>
                <input
                  value={clubs[e.id] ?? ''}
                  onChange={(ev) => setClubs((c) => ({ ...c, [e.id]: ev.target.value }))}
                  placeholder={vue.clubs[e.id] && !vue.clubsSaisis[e.id] ? `${vue.clubs[e.id]} (déduit)` : 'Club'}
                  maxLength={80}
                  className={`${CHAMP} w-52`}
                  aria-label={`Club de l'équipe ${e.numero}`}
                />
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={enCours || !clubsModifies}
            onClick={() =>
              lancer(
                () =>
                  enregistrerClubsEquipes(
                    tournoi.id,
                    equipesPermanentes.map((e) => ({ equipeId: e.id, club: clubs[e.id] ?? null })),
                  ),
                tirage ? 'Clubs enregistrés. Refaites le tirage pour en tenir compte.' : 'Clubs enregistrés.',
              )
            }
            className={`${BTN} mt-3 bg-terracotta text-white`}
          >
            <Check size={14} /> {enCours ? 'Enregistrement…' : 'Enregistrer les clubs'}
          </button>
        </Carte>
      )}

      <Carte titre={tirage ? `${vue.poules.length} poules` : 'Tirage des poules'}>
        {!tirage && (
          <p className="mb-3 text-[13px] text-encre-douce">
            {equipesPermanentes.length} équipes. Le tirage au sort répartit les équipes en poules équilibrées ; vous pourrez le refaire tant
            que la première partie n&apos;est pas composée.
          </p>
        )}
        {tirage && vue.conflitsClub > 0 && (
          <p className="mb-3 rounded-xl border border-laiton/40 bg-laiton/10 px-4 py-2.5 text-[12.5px] text-[#7a5c1f]">
            {`Le tirage n’a pas pu séparer ${vue.conflitsClub} paire${vue.conflitsClub > 1 ? 's' : ''} d’équipes du même club (trop d’équipes d’un même club pour le nombre de poules).`}
          </p>
        )}

        {tirage && (
          <div className="grid gap-3 sm:grid-cols-2">
            {vue.poules.map((p) => {
              const joue = p.classement.some((l) => l.joues > 0);
              const lignes = joue ? p.classement : [...p.classement].sort((a, b) => a.ordreTirage - b.ordreTirage);
              return (
                <article key={p.id} className="min-w-0 rounded-xl border border-ligne bg-sable p-3.5">
                  <h3 className="font-display mb-2 flex items-baseline justify-between text-[15px]">
                    <span>Poule {p.nom}</span>
                    <span className="text-[11px] font-normal text-encre-douce">{p.equipes.length} équipes</span>
                  </h3>
                  <ul className="flex flex-col gap-1.5">
                    {lignes.map((l) => {
                      const eq = equipesPermanentes.find((e) => e.id === l.id);
                      const qualifie = p.complet && l.rang <= p.qualifiesK;
                      return (
                        <li key={l.id} className="flex items-start gap-2 text-[13px]">
                          <span className="font-score mt-px w-6 text-[15px] text-terracotta">{eq?.numero ?? '?'}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words">{membresDe(l.id)}</span>
                            {vue.clubs[l.id] && <span className="block text-[11px] text-encre-douce">{vue.clubs[l.id]}</span>}
                          </span>
                          {joue && (
                            <span className="whitespace-nowrap text-[11.5px] text-encre-douce">
                              {l.victoires} V · {l.diff > 0 ? '+' : ''}
                              {l.diff}
                            </span>
                          )}
                          {qualifie && <span className="rounded-full bg-pin/12 px-2 py-0.5 text-[10.5px] font-medium text-pin">Qualifiée</span>}
                        </li>
                      );
                    })}
                  </ul>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={enCours || demarre}
            onClick={() => lancer(() => tirerLesPoules(tournoi.id), tirage ? 'Tirage refait.' : 'Poules tirées au sort.')}
            className={`${BTN} bg-terracotta text-white`}
          >
            <Shuffle size={14} /> {tirage ? 'Refaire le tirage' : 'Tirer les poules au sort'}
          </button>
          {tirage && (
            <BoutonPdf
              libelle="Imprimer les poules"
              fichier={nomFichier(tournoi.nom, tournoi.dateTournoi, 'poules')}
              document={DocumentPoules(donneesPdf)}
            />
          )}
          {demarre && (
            <p className="text-[11.5px] text-encre-douce">
              Le concours a commencé : le tirage est figé. Annulez les parties pour le refaire.
            </p>
          )}
        </div>
      </Carte>
    </section>
  );
}

// ------------------------------------------------------------- classement

const TITRE_TABLEAU = { principal: 'Tableau principal', consolante: 'Consolante' } as const;

function libelleRang(rang: number): string {
  if (rang === 1) return 'Vainqueur';
  if (rang === 2) return 'Finaliste';
  return `${rang}ᵉ`;
}

export function VueClassementPoules({
  tournoi,
  vue,
  partiesDetail,
  equipesPermanentes,
  membresDe,
  toutesJouees,
  enCours,
  lancer,
  donneesPdf,
}: {
  tournoi: Tournoi;
  vue: VuePoules;
  partiesDetail: PartieDetail[];
  equipesPermanentes: EquipePermanente[];
  membresDe: (id: number) => string;
  toutesJouees: boolean;
  enCours: boolean;
  lancer: Lancer;
  donneesPdf: DonneesPdf;
}) {
  const numero = (id: number) => equipesPermanentes.find((e) => e.id === id)?.numero ?? id;
  const nom = (id: number | null) => (id == null ? '—' : `Équipe ${numero(id)}`);
  const termine = tournoi.statut === 'termine';

  if (vue.poules.length === 0) {
    return (
      <Carte titre="Classement">
        <p className="text-[13px] text-encre-douce">Le classement apparaît une fois les poules tirées et les premières parties jouées.</p>
      </Carte>
    );
  }

  return (
    <section className="flex flex-col gap-5">
      {vue.avertissements.length > 0 && (
        <div className="rounded-xl border border-laiton/40 bg-laiton/10 px-4 py-2.5 text-[12.5px] text-[#7a5c1f]">
          {vue.avertissements.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </div>
      )}

      <Carte titre="Les poules">
        <div className="flex flex-col gap-5">
          {vue.poules.map((p) => (
            <div key={p.id}>
              <h3 className="font-display mb-1.5 text-[14.5px]">
                Poule {p.nom} {!p.complet && <span className="text-[11px] font-normal text-encre-douce">· en cours</span>}
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-[13px]">
                  <thead>
                    <tr className="border-b border-encre/20 text-[10.5px] text-encre-douce">
                      <th className="w-9 pb-1.5 text-center font-medium">Rg</th>
                      <th className="pb-1.5 text-left font-medium">Équipe</th>
                      <th className="w-8 pb-1.5 text-center font-medium">J</th>
                      <th className="w-8 pb-1.5 text-center font-medium">V</th>
                      <th className="w-12 pb-1.5 text-center font-medium">Pts +</th>
                      <th className="w-12 pb-1.5 text-center font-medium">Pts −</th>
                      <th className="w-14 pb-1.5 text-center font-medium">Goal-av.</th>
                      <th className="w-20 pb-1.5 text-center font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {p.classement.map((l) => (
                      <tr key={l.id} className="border-b border-ligne last:border-0">
                        <td className="font-score py-2 text-center text-[16px] text-encre-douce">
                          {l.rang}
                          {l.exaequo && <span className="ml-0.5 text-[10px] text-laiton">=</span>}
                        </td>
                        <td className="py-2">
                          <span className="font-medium">{nom(l.id)}</span>
                          <span className="ml-2 text-[11.5px] text-encre-douce">{membresDe(l.id)}</span>
                        </td>
                        <td className="py-2 text-center">{l.joues}</td>
                        <td className="font-score py-2 text-center text-[16px] text-pin">{l.victoires}</td>
                        <td className="py-2 text-center">{l.pointsPour}</td>
                        <td className="py-2 text-center">{l.pointsContre}</td>
                        <td className={`font-score py-2 text-center text-[14px] ${l.diff > 0 ? 'text-pin' : l.diff < 0 ? 'text-danger' : ''}`}>
                          {l.diff > 0 ? '+' : ''}
                          {l.diff}
                        </td>
                        <td className="py-2 text-center">
                          {p.complet && l.rang <= p.qualifiesK && (
                            <span className="rounded-full bg-pin/12 px-2 py-0.5 text-[10.5px] font-medium text-pin">Qualifiée</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11.5px] text-encre-douce">
          {vue.mode === 'repechage'
            ? 'Poule de 4 à repêchage : le rang se lit sur l’arbre (vainqueur du match des gagnants, vainqueur du barrage, perdant du barrage, perdant du match des perdants). '
            : ''}
          Départage dans une poule : victoires, puis confrontation directe entre deux équipes à égalité, puis goal-average, puis points marqués.
          « = » : égalité parfaite, départagée au rang du tirage.
        </p>
      </Carte>

      {vue.tableaux.map((t) => {
        const rencontres = partiesDetail.flatMap((p) => p.rencontres).filter((r) => vue.etiquettes[r.id]?.startsWith(`${TITRE_TABLEAU[t.tableau]} ·`));
        const tours = [...new Set(rencontres.map((r) => vue.etiquettes[r.id]))];
        const rangs = [...new Set(t.classement.map((c) => c.rang).filter((r): r is number => r != null))].sort((a, b) => a - b);
        return (
          <Carte key={t.tableau} titre={TITRE_TABLEAU[t.tableau]}>
            {tours.length === 0 ? (
              <p className="text-[13px] text-encre-douce">Pas encore joué.</p>
            ) : (
              <div className="flex flex-col gap-4">
                {tours.map((tour) => (
                  <div key={tour}>
                    <h3 className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-encre-douce">{tour.split('· ')[1]}</h3>
                    <ul className="flex flex-col gap-1">
                      {rencontres
                        .filter((r) => vue.etiquettes[r.id] === tour)
                        .map((r) => {
                          const joue = r.scoreA != null && r.scoreB != null;
                          const gagneA = joue && r.scoreA! > r.scoreB!;
                          return (
                            <li key={r.id} className="flex items-center gap-2 text-[13px]">
                              <span className={`flex-1 text-right ${gagneA ? 'font-semibold text-pin' : ''}`}>{nom(r.equipeAId)}</span>
                              <span className="font-score w-16 text-center text-[15px]">{joue ? `${r.scoreA} – ${r.scoreB}` : '– – –'}</span>
                              <span className={`flex-1 ${joue && !gagneA ? 'font-semibold text-pin' : ''}`}>{nom(r.equipeBId)}</span>
                            </li>
                          );
                        })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {t.termine && (
              <div className="mt-4 border-t border-ligne pt-3">
                <h3 className="mb-1.5 text-[12px] font-medium uppercase tracking-wide text-encre-douce">Classement du tableau</h3>
                <ul className="flex flex-col gap-0.5 text-[13px]">
                  {rangs.map((rg) => (
                    <li key={rg}>
                      <span className="font-score mr-2 inline-block w-20 text-[14px] text-terracotta">{libelleRang(rg)}</span>
                      {t.classement
                        .filter((c) => c.rang === rg)
                        .map((c) => nom(c.id))
                        .join(' · ')}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Carte>
        );
      })}

      <div className="flex flex-wrap gap-2">
        <BoutonPdf
          libelle="Imprimer les résultats"
          fichier={nomFichier(tournoi.nom, tournoi.dateTournoi, 'resultats')}
          document={DocumentResultatsPoules(donneesPdf)}
          principal
        />
        {!termine ? (
          <button
            type="button"
            disabled={enCours || !toutesJouees}
            onClick={() => lancer(() => cloturerTournoi(tournoi.id), 'Tournoi clôturé.')}
            className={`${BTN} bg-pin text-white`}
          >
            <Check size={14} /> Clôturer le tournoi
          </button>
        ) : (
          <button
            type="button"
            disabled={enCours}
            onClick={() => lancer(() => rouvrirTournoi(tournoi.id), 'Tournoi rouvert.')}
            className={`${BTN} border border-ligne bg-sable`}
          >
            Rouvrir le tournoi
          </button>
        )}
        {!toutesJouees && !termine && (
          <p className="self-center text-[11.5px] text-encre-douce">
            {vue.prochaine ? `Il reste à jouer : ${vue.prochaine}.` : 'La clôture attend que toutes les parties soient jouées et saisies.'}
          </p>
        )}
      </div>
    </section>
  );
}
