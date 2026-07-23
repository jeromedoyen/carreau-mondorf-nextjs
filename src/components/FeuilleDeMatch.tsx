'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PartieExistante, RencontreDetail } from '@/lib/rencontreDetail';
import { enregistrerResultatRencontre, type PartieSaisie } from '@/lib/actions/matchSheet';

type Ligne = PartieSaisie;

/** Structure des 4 phases du règlement FLBP (cf. pointsVictoirePartie_,
 *  ChampionnatBackend.gs) : 9 Tête à tête, 3 Triplette, 4 Doublette + 1
 *  Tête à tête, 3 Triplette — 20 parties au total. */
const GABARIT_PHASES: { phase: number; type: Ligne['type']; nombre: number }[] = [
  { phase: 1, type: 'Tête à tête', nombre: 9 },
  { phase: 2, type: 'Triplette', nombre: 3 },
  { phase: 3, type: 'Doublette', nombre: 4 },
  { phase: 3, type: 'Tête à tête', nombre: 1 },
  { phase: 4, type: 'Triplette', nombre: 3 },
];

function lignesParDefaut(existantes: PartieExistante[]): Ligne[] {
  const lignes: Ligne[] = [];
  GABARIT_PHASES.forEach(({ phase, type, nombre }) => {
    for (let ordre = 1; ordre <= nombre; ordre++) {
      const trouvee = existantes.find((p) => p.phase === phase && p.type === type && p.ordre === ordre);
      lignes.push({
        phase,
        type,
        ordre,
        joueursCM: trouvee?.joueursCM ?? '',
        joueursAdverse: trouvee?.joueursAdverse ?? '',
        scoreCM: trouvee?.scoreCM ?? 0,
        scoreAdverse: trouvee?.scoreAdverse ?? 0,
        terrain: trouvee?.terrain ?? '',
      });
    }
  });
  return lignes;
}

const LABEL_PHASE: Record<number, string> = {
  1: 'Phase 1',
  2: 'Phase 2',
  3: 'Phase 3',
  4: 'Phase 4',
};

export function FeuilleDeMatch({ rencontre }: { rencontre: RencontreDetail }) {
  const router = useRouter();
  const [lignes, setLignes] = useState<Ligne[]>(() => lignesParDefaut(rencontre.parties));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  function modifierLigne(index: number, champ: keyof Ligne, valeur: string | number) {
    setLignes((prev) => prev.map((l, i) => (i === index ? { ...l, [champ]: valeur } : l)));
  }

  async function soumettre() {
    setErreur(null);
    setEnCours(true);
    const resultat = await enregistrerResultatRencontre(rencontre.id, lignes);
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    router.push('/national-d2');
    router.refresh();
  }

  // Regroupe les lignes par (phase, type) pour l'affichage, dans l'ordre du gabarit.
  const groupes = GABARIT_PHASES.map(({ phase, type }) => ({
    phase,
    type,
    lignes: lignes
      .map((l, index) => ({ ...l, index }))
      .filter((l) => l.phase === phase && l.type === type),
  }));

  return (
    <div className="flex flex-col gap-6">
      {groupes.map(({ phase, type, lignes: lignesGroupe }) => (
        <div
          key={`${phase}-${type}`}
          className="rounded-2xl border border-ligne bg-sable-carte p-6 shadow-[0_1px_3px_rgba(36,27,18,.04)]"
        >
          <h3 className="font-display m-0 mb-4 text-lg">
            {LABEL_PHASE[phase]} — {type}
          </h3>
          <div className="overflow-x-auto">
            <div className="flex min-w-[560px] flex-col gap-2.5">
              {lignesGroupe.map((l) => (
                <div key={l.index} className="grid grid-cols-[1fr_1fr_60px_60px_70px] items-center gap-2 text-[13px]">
                  <input
                    type="text"
                    value={l.joueursCM}
                    onChange={(e) => modifierLigne(l.index, 'joueursCM', e.target.value)}
                    placeholder="Joueurs Carreau Mondorf"
                    aria-label={`${LABEL_PHASE[phase]} ${type} ${l.ordre} — joueurs Carreau Mondorf`}
                    className="rounded-lg border border-ligne bg-sable px-2.5 py-1.5 text-encre outline-none focus:border-terracotta"
                  />
                  <input
                    type="text"
                    value={l.joueursAdverse}
                    onChange={(e) => modifierLigne(l.index, 'joueursAdverse', e.target.value)}
                    placeholder="Joueurs adverses"
                    aria-label={`${LABEL_PHASE[phase]} ${type} ${l.ordre} — joueurs adverses`}
                    className="rounded-lg border border-ligne bg-sable px-2.5 py-1.5 text-encre outline-none focus:border-terracotta"
                  />
                  <input
                    type="number"
                    min={0}
                    value={l.scoreCM}
                    onChange={(e) => modifierLigne(l.index, 'scoreCM', Number(e.target.value))}
                    aria-label={`${LABEL_PHASE[phase]} ${type} ${l.ordre} — score Carreau Mondorf`}
                    className="rounded-lg border border-ligne bg-sable px-2 py-1.5 text-center text-encre outline-none focus:border-terracotta"
                  />
                  <input
                    type="number"
                    min={0}
                    value={l.scoreAdverse}
                    onChange={(e) => modifierLigne(l.index, 'scoreAdverse', Number(e.target.value))}
                    aria-label={`${LABEL_PHASE[phase]} ${type} ${l.ordre} — score adverse`}
                    className="rounded-lg border border-ligne bg-sable px-2 py-1.5 text-center text-encre outline-none focus:border-terracotta"
                  />
                  <input
                    type="text"
                    value={l.terrain}
                    onChange={(e) => modifierLigne(l.index, 'terrain', e.target.value)}
                    placeholder="Terrain"
                    aria-label={`${LABEL_PHASE[phase]} ${type} ${l.ordre} — terrain`}
                    className="rounded-lg border border-ligne bg-sable px-2 py-1.5 text-center text-encre outline-none focus:border-terracotta"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      {erreur && <p className="text-[13px] text-danger">{erreur}</p>}

      <button
        type="button"
        onClick={soumettre}
        disabled={enCours}
        className="font-display self-start rounded-lg bg-terracotta px-5 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Enregistrement…' : 'Enregistrer le résultat'}
      </button>
    </div>
  );
}
