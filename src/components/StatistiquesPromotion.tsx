'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronUp, LayoutDashboard } from 'lucide-react';
import type {
  PartieJoueurPromotion,
  StatistiquesPromotion as StatistiquesPromotionData,
} from '@/lib/types';
import { cleNomJoueur, sansAccentsMinuscules } from '@/lib/normalisationTexte';
import { createClient } from '@/lib/supabase/client';
import { SparklinePoints, GraphiquePointsParJournee } from './StatsCharts';

type TriColonne = 'tauxVictoire' | 'participations' | 'points';

function formatPct(v: number) {
  return `${Math.round(v * 100)}%`;
}

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }).replace('.', '');
}

const COLONNES: [TriColonne, string][] = [
  ['tauxVictoire', 'Taux de victoire'],
  ['participations', 'Journées jouées'],
  ['points', 'Points'],
];

function LignePartie({ p }: { p: PartieJoueurPromotion }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px]">
      <span className="flex min-w-0 items-center gap-1.5 truncate text-encre-douce">
        J{p.journee} · {formatDate(p.date)} ·{' '}
        {p.exempt ? <em>exempt</em> : p.adversaireClub}
      </span>
      <span className={p.gagnee ? 'shrink-0 text-pin' : 'shrink-0 text-danger'}>
        {p.exempt ? '13-0' : `${p.scoreCM}-${p.scoreAdverse}`}
        {/* Sans cette mention, un 11-8 gagné se lirait comme une erreur de
            saisie : le vainqueur d'une partie de pétanque a d'ordinaire 13. */}
        {p.auTemps ? ' au temps' : ''}
        {p.gagnee ? ' (+5)' : ''}
      </span>
    </div>
  );
}

/** Statistiques individuelles du championnat Promotion, alignées sur celles
 *  du National (`StatistiquesD2`) : classement individuel triable, et sous
 *  chaque joueur un panneau dépliable — points par journée, toutes ses
 *  parties avec l'adversaire et le score, ses partenaires de trio.
 *
 *  Le détail des parties vient des feuilles de journée de la FLBP
 *  (`promotion_parties`, migration 0068). Une saison sans feuille importée
 *  (2025) garde son bilan par trio ; le panneau le dit alors en clair
 *  plutôt que d'afficher une liste vide.
 *
 *  Le résultat est celui du trio : les parties gagnées sont portées à
 *  chacun de ses trois membres — le championnat n'enregistre rien joueur
 *  par joueur.
 *
 *  `monNom` met en évidence la ligne du licencié connecté ; le classement
 *  est déjà ouvert à tout licencié (`promotion_equipes` n'a pas la
 *  restriction CA de `parties_d2`, retour Jérôme 26/07/2026). Le lien vers
 *  le tableau de bord d'un joueur n'apparaît que pour le comité, comme en D2. */
export function StatistiquesPromotion({
  stats,
  monNom,
  saison,
}: {
  stats: StatistiquesPromotionData;
  monNom?: string | null;
  saison: string;
}) {
  const [tri, setTri] = useState<TriColonne>('tauxVictoire');
  const [ouvert, setOuvert] = useState<string | null>(null);
  const [fichesParJoueur, setFichesParJoueur] = useState<Map<string, number>>(new Map());

  /* Même mécanique que StatistiquesD2 : `licencies_saison()` n'est ouverte
   * qu'aux comptes authentifiés et ne renvoie qu'id, nom et prénom (0064) ;
   * on ne l'appelle que pour un membre du comité, seul à avoir un tableau
   * de bord par membre à ouvrir. */
  useEffect(() => {
    const supabase = createClient();
    let annule = false;
    supabase.rpc('est_membre_ca').then(async ({ data: ca }) => {
      if (annule || !ca) return;
      const { data: licencies } = await supabase.rpc('licencies_saison', { p_saison: saison });
      if (annule) return;
      setFichesParJoueur(
        new Map(
          ((licencies ?? []) as { id: number; nom: string; prenom: string }[]).map((l) => [
            cleNomJoueur(`${l.prenom} ${l.nom}`),
            l.id,
          ])
        )
      );
    });
    return () => {
      annule = true;
    };
  }, [saison]);

  const joueursTries = useMemo(
    () =>
      [...stats.joueurs].sort((a, b) =>
        tri === 'tauxVictoire'
          ? b.tauxVictoire - a.tauxVictoire || b.participations - a.participations
          : tri === 'participations'
            ? b.participations - a.participations || b.tauxVictoire - a.tauxVictoire
            : b.pointsTotal - a.pointsTotal || b.tauxVictoire - a.tauxVictoire
      ),
    [stats.joueurs, tri]
  );

  if (!stats.joueurs.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucune équipe importée pour cette saison.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display m-0 text-xl">Classement individuel</h3>
          <div className="flex gap-1.5">
            {COLONNES.map(([cle, label]) => (
              <button
                key={cle}
                onClick={() => setTri(cle)}
                className={`rounded-full px-3 py-1 text-[12px] transition-colors ${
                  tri === cle
                    ? 'bg-terracotta text-white'
                    : 'bg-sable text-encre-douce hover:text-encre'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col">
          {joueursTries.map((j, i) => {
            const estOuvert = ouvert === j.nom;
            const cToi = !!monNom && sansAccentsMinuscules(j.nom) === sansAccentsMinuscules(monNom);
            return (
              <div key={j.nom} className="border-t border-ligne first:border-t-0">
                <button
                  onClick={() => setOuvert(estOuvert ? null : j.nom)}
                  aria-expanded={estOuvert}
                  // Sur téléphone, les colonnes fixes de la grille complète
                  // (332 px) plus les marges dépassaient les 375 px de large
                  // (constaté le 23/09/2026) : la courbe miniature disparaît
                  // et les colonnes se resserrent en dessous de `sm`.
                  className={`grid w-full grid-cols-[24px_minmax(0,1fr)_44px_64px_20px] items-center gap-2 py-2.5 text-left text-[13px] hover:bg-sable/60 sm:grid-cols-[28px_1fr_70px_64px_90px_20px] sm:gap-3 ${
                    cToi ? 'rounded-lg bg-pin/5 px-2' : ''
                  }`}
                >
                  <span className="font-score text-encre-douce/70">{i + 1}</span>
                  <span className="min-w-0 truncate font-medium text-encre">
                    {j.nom}
                    {cToi && (
                      <span className="ml-2 rounded-full bg-pin px-2 py-0.5 text-[10px] font-medium text-sable-carte">
                        Toi
                      </span>
                    )}
                  </span>
                  <span className="text-encre-douce">{j.participations} j.</span>
                  <span className="hidden sm:block">
                    <SparklinePoints valeurs={j.pointsParJournee.map((pj) => pj.points)} />
                  </span>
                  <span className="font-score text-base text-terracotta">
                    {tri === 'points' ? `${j.pointsTotal} pts` : formatPct(j.tauxVictoire)}
                  </span>
                  {estOuvert ? (
                    <ChevronUp size={15} className="text-encre-douce/50" />
                  ) : (
                    <ChevronDown size={15} className="text-encre-douce/50" />
                  )}
                </button>
                {estOuvert && (
                  // `[&>*]:min-w-0` : sans ça, une cellule de grille refuse de
                  // rétrécir sous la largeur de son contenu et le graphique
                  // déborde sur la colonne voisine (leçon du 22/09 côté D2).
                  <div className="entree grid gap-4 border-t border-ligne bg-sable/40 px-2 py-4 [&>*]:min-w-0 sm:grid-cols-3">
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wide text-encre-douce/60">
                        Points par journée ({j.pointsTotal} au total ·{' '}
                        {j.partiesGagnees}/{j.partiesJouees} parties gagnées)
                      </p>
                      {j.pointsParJournee.length ? (
                        <GraphiquePointsParJournee donnees={j.pointsParJournee} />
                      ) : (
                        <p className="text-[12.5px] text-encre-douce">Aucun point marqué.</p>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wide text-encre-douce/60">
                        Toutes les parties ({j.parties.length || j.partiesJouees})
                      </p>
                      {j.parties.length ? (
                        <div className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
                          {j.parties.map((p) => (
                            <LignePartie key={`${p.journee}-${p.numeroEquipe}-${p.numero}`} p={p} />
                          ))}
                        </div>
                      ) : (
                        <p className="text-[12.5px] leading-relaxed text-encre-douce">
                          Le détail des parties n’a pas été importé pour cette saison : seul le bilan du
                          trio par journée est connu.
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-[11px] uppercase tracking-wide text-encre-douce/60">
                        Partenaires de trio
                      </p>
                      {j.partenaires.length ? (
                        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[12.5px]">
                          {j.partenaires.map((p) => (
                            <li key={p.nom} className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate text-encre">{p.nom}</span>
                              <span className="shrink-0 text-encre-douce">
                                {p.journees} journée{p.journees > 1 ? 's' : ''}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[12.5px] text-encre-douce">Aucun partenaire enregistré.</p>
                      )}
                    </div>
                    {/* Le lien vit dans le panneau déplié, pas sur la ligne :
                        celle-ci est un <button> qui ouvre le détail, et un
                        <a> ne peut pas y être imbriqué. */}
                    {fichesParJoueur.has(cleNomJoueur(j.nom)) && (
                      <div className="border-t border-ligne pt-3 sm:col-span-3">
                        <Link
                          href={`/membres/${fichesParJoueur.get(cleNomJoueur(j.nom))}/tableau-de-bord`}
                          className="inline-flex items-center gap-2 rounded-lg px-1.5 py-1 text-[12.5px] text-terracotta hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta"
                        >
                          <LayoutDashboard size={13} className="shrink-0" aria-hidden="true" />
                          Voir le tableau de bord de {j.nom}
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="m-0 mt-4 text-[11.5px] leading-relaxed text-encre-douce/70">
          En Promotion, le résultat est celui du trio : ses parties gagnées sont portées à chacun de
          ses trois membres, 5 points la partie.
          {!stats.detailDisponible &&
            ' Le détail partie par partie n’est pas disponible pour cette saison.'}
        </p>
      </div>

      {stats.trios.length > 0 && (
        <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
          <h3 className="font-display m-0 mb-5 text-xl">Bilan par trio</h3>
          <div className="flex flex-col">
            {stats.trios.map((t) => (
              <div
                key={t.joueurs.join('+')}
                className="grid grid-cols-[1fr_110px_70px] items-center gap-3 border-t border-ligne py-2.5 text-[13px] first:border-t-0"
              >
                <span className="text-encre">{t.joueurs.join(' + ')}</span>
                <span className="text-encre-douce">
                  {t.participations} journée{t.participations > 1 ? 's' : ''}
                </span>
                <span className="font-score text-base text-terracotta">
                  {formatPct(t.tauxVictoire)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
