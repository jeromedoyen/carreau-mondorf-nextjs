'use client';

import { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  getJoueursSelectionnables,
  proposerCompositionEquipe,
  type JoueurSelectionnable,
  type CompositionEquipe,
  type StrategieComposition,
} from '@/lib/actions/propositionEquipe';

const TAILLE_EQUIPE = 9;

type Etat = 'verification' | 'refuse' | 'chargement' | 'pret';

/** Sélection de 9 joueurs (au moins une féminine) puis demande à l'IA la
 *  meilleure répartition en triplettes/doublettes selon le règlement FLBP
 *  — demande de Jérôme, 01/08/2026. Les joueurs ayant déjà des statistiques
 *  cette saison sont présentés en premier (aJoueCetteSaison), mais tout
 *  licencié reste sélectionnable — l'IA compose avec ce qu'elle a.
 *
 *  Se charge lui-même côté client (même principe que StatistiquesD2.tsx) :
 *  la page /national-d2 doit rester statique, donc ni la vérification CA
 *  ni la lecture de `personnes` (CA-only) ne peuvent se faire dans le
 *  Server Component de la page. */
export function PropositionEquipeIA({ saison }: { saison: string }) {
  const [etat, setEtat] = useState<Etat>('verification');
  const [joueurs, setJoueurs] = useState<JoueurSelectionnable[]>([]);
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [composition, setComposition] = useState<CompositionEquipe | null>(null);

  useEffect(() => {
    let annule = false;
    createClient()
      .rpc('est_membre_ca')
      .then(async ({ data: ca }) => {
        if (annule) return;
        if (!ca) {
          setEtat('refuse');
          return;
        }
        setEtat('chargement');
        const liste = await getJoueursSelectionnables(saison);
        if (annule) return;
        setJoueurs(liste);
        setEtat('pret');
      });
    return () => {
      annule = true;
    };
  }, [saison]);

  function basculer(nom: string) {
    setComposition(null);
    setErreur(null);
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(nom)) {
        suivant.delete(nom);
      } else if (suivant.size < TAILLE_EQUIPE) {
        suivant.add(nom);
      }
      return suivant;
    });
  }

  const aUneFeminine = [...selection].some((nom) => joueurs.find((j) => j.nom === nom)?.sexe === 'F');
  const pretPourIA = selection.size === TAILLE_EQUIPE && aUneFeminine;

  async function demanderIA() {
    setEnCours(true);
    setErreur(null);
    setComposition(null);
    const resultat = await proposerCompositionEquipe(saison, [...selection]);
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setComposition(resultat.composition);
  }

  if (etat === 'verification' || etat === 'chargement') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Chargement…
      </div>
    );
  }

  if (etat === 'refuse') {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-center text-[13.5px] text-encre-douce">
        La proposition de composition d&apos;équipe est réservée au comité d&apos;administration.
      </div>
    );
  }

  if (!joueurs.length) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 text-[13.5px] text-encre-douce">
        Aucun licencié trouvé pour la saison {saison}.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display m-0 text-xl">Sélection des 9 joueurs</h3>
          <span
            className={`font-score text-[13px] ${
              selection.size === TAILLE_EQUIPE ? 'text-pin' : 'text-encre-douce'
            }`}
          >
            {selection.size} / {TAILLE_EQUIPE}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {joueurs.map((j) => {
            const coche = selection.has(j.nom);
            const desactive = !coche && selection.size >= TAILLE_EQUIPE;
            return (
              <label
                key={j.nom}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] transition-colors ${
                  coche ? 'bg-terracotta/10 text-encre' : 'text-encre-douce'
                } ${desactive ? 'opacity-40' : 'cursor-pointer hover:bg-sable'}`}
              >
                <input
                  type="checkbox"
                  checked={coche}
                  disabled={desactive}
                  onChange={() => basculer(j.nom)}
                  className="shrink-0 accent-terracotta"
                />
                <span className="flex-1 truncate">{j.nom}</span>
                {j.sexe === 'F' && <span className="shrink-0 text-[11px] text-terracotta">F</span>}
                {j.aJoueCetteSaison && (
                  <span className="shrink-0 rounded-full bg-pin/10 px-1.5 py-0.5 text-[10px] text-pin">
                    a joué
                  </span>
                )}
              </label>
            );
          })}
        </div>

        {selection.size === TAILLE_EQUIPE && !aUneFeminine && (
          <p className="mt-3 text-[12.5px] text-danger">La sélection doit inclure au moins une féminine.</p>
        )}
        {erreur && <p className="mt-3 text-[12.5px] text-danger">{erreur}</p>}

        <button
          type="button"
          onClick={demanderIA}
          disabled={!pretPourIA || enCours}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-terracotta px-4 py-2.5 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Sparkles size={15} />
          {enCours ? 'Analyse en cours…' : 'Demander les compositions à l’IA'}
        </button>
      </div>

      {composition && <ResultatComposition composition={composition} />}
    </div>
  );
}

function GroupeJoueurs({ joueurs }: { joueurs: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {joueurs.map((j) => (
        <span key={j} className="rounded-full bg-sable px-2.5 py-1 text-[12px] text-encre">
          {j}
        </span>
      ))}
    </div>
  );
}

function CarteStrategie({
  titre,
  description,
  strategie,
}: {
  titre: string;
  description: string;
  strategie: StrategieComposition;
}) {
  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <h4 className="font-display m-0 text-lg">{titre}</h4>
        <span className="font-score shrink-0 text-2xl text-terracotta">
          {Math.round(strategie.probabiliteVictoireRencontre)}%
        </span>
      </div>
      <p className="mb-5 text-[12px] leading-relaxed text-encre-douce/80">{description}</p>

      <div className="flex flex-col gap-4">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-encre-douce/60">Phase 2 — Triplettes</p>
          <div className="flex flex-col gap-2">
            {strategie.phase2Triplettes.map((g, i) => (
              <GroupeJoueurs key={i} joueurs={g} />
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-encre-douce/60">
            Phase 3 — Doublettes + tête à tête
          </p>
          <div className="flex flex-col gap-2">
            {strategie.phase3Doublettes.map((g, i) => (
              <GroupeJoueurs key={i} joueurs={g} />
            ))}
            <GroupeJoueurs joueurs={[strategie.phase3TeteATeteSolo]} />
          </div>
        </div>

        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-encre-douce/60">Phase 4 — Triplettes</p>
          <div className="flex flex-col gap-2">
            {strategie.phase4Triplettes.map((g, i) => (
              <GroupeJoueurs key={i} joueurs={g} />
            ))}
          </div>
        </div>

        <div className="border-t border-ligne pt-4">
          <p className="mb-1.5 text-[11px] uppercase tracking-wide text-encre-douce/60">Analyse</p>
          <p className="text-[13px] leading-relaxed text-encre-douce">{strategie.justification}</p>
        </div>
      </div>
    </div>
  );
}

function ResultatComposition({ composition }: { composition: CompositionEquipe }) {
  return (
    <div className="entree grid grid-cols-1 gap-5 lg:grid-cols-2 lg:items-start">
      <CarteStrategie
        titre="Agressive"
        description="Chaque groupe est optimisé pour sa propre victoire — objectif : gagner le maximum de parties."
        strategie={composition.agressive}
      />
      <CarteStrategie
        titre="Défensive"
        description="Une triplette rendue quasi-imbattable (les 3 meilleurs concentrés), quitte à affaiblir les deux autres — utile quand une seule victoire en triplette suffit."
        strategie={composition.defensive}
      />
    </div>
  );
}
