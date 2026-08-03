'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { repondreClarificationConcours } from '@/lib/actions/clarificationConcours';
import type { Licencie } from '@/lib/fuzzyMatch';

function sansAccentsMinuscules(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

type Ambiguite = { champ: string; question: string };

/** Un champ par ambiguïté détectée à la déclaration : le club s'il
 *  manquait, et un sélecteur de licencié par nom non reconnu dans le
 *  vocal (champ au format "partenaire:<nom dicté>"). */
export function ClarificationConcoursForm({
  jeton,
  ambiguites,
  clubInitial,
  licencies,
}: {
  jeton: string;
  ambiguites: Ambiguite[];
  clubInitial: string;
  licencies: Licencie[];
}) {
  const router = useRouter();
  const clubManquant = ambiguites.some((a) => a.champ === 'club');
  const partenairesAmbigus = ambiguites.filter((a) => a.champ.startsWith('partenaire:'));

  const [club, setClub] = useState(clubInitial);
  const [choix, setChoix] = useState<(number | null)[]>(partenairesAmbigus.map(() => null));
  const [ignores, setIgnores] = useState<boolean[]>(partenairesAmbigus.map(() => false));
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const dejaChoisis = useMemo(() => choix.filter((id): id is number => id != null), [choix]);

  async function soumettre() {
    setErreur(null);
    if (clubManquant && !club.trim()) {
      setErreur('Indique dans quelle ville / quel club se déroule le concours.');
      return;
    }
    const manque = choix.some((id, i) => id == null && !ignores[i]);
    if (manque) {
      setErreur("Choisis un licencié pour chaque partenaire, ou coche « ce n'est pas un licencié ».");
      return;
    }
    setEnCours(true);
    const resultat = await repondreClarificationConcours({
      jeton,
      club: clubManquant ? club.trim() : null,
      partenaireIds: dejaChoisis,
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    router.push('/concours');
  }

  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-ligne bg-sable-carte p-6">
      {clubManquant && (
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px]">Ville / club du concours</span>
          <input
            type="text"
            value={club}
            onChange={(e) => setClub(e.target.value)}
            placeholder="ex. Differdange"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </label>
      )}

      {partenairesAmbigus.map((ambiguite, i) => {
        const nomDicte = ambiguite.champ.slice('partenaire:'.length);
        return (
          <div key={ambiguite.champ} className="flex flex-col gap-1.5">
            <span className="text-[13px]">Tu as dit « {nomDicte} », c&apos;est qui exactement ?</span>
            <PickerLicencie
              licencies={licencies}
              exclureIds={choix.filter((id, j): id is number => j !== i && id != null)}
              valeur={choix[i]}
              desactive={ignores[i]}
              onChange={(id) => setChoix((prev) => prev.map((c, j) => (j === i ? id : c)))}
            />
            <label className="flex items-center gap-1.5 text-[12px] text-encre-douce">
              <input
                type="checkbox"
                checked={ignores[i]}
                onChange={(e) => {
                  const coche = e.target.checked;
                  setIgnores((prev) => prev.map((v, j) => (j === i ? coche : v)));
                  if (coche) setChoix((prev) => prev.map((c, j) => (j === i ? null : c)));
                }}
                className="accent-terracotta"
              />
              Ce n&apos;est pas un licencié (invité, joueur d&apos;un autre club…)
            </label>
          </div>
        );
      })}

      {erreur && <p className="text-[13px] text-terracotta">{erreur}</p>}

      <button
        type="button"
        onClick={soumettre}
        disabled={enCours}
        className="self-start rounded-xl bg-terracotta px-4 py-2.5 text-[14px] text-white disabled:opacity-50"
      >
        {enCours ? 'Envoi…' : 'Valider ma déclaration'}
      </button>
    </div>
  );
}

/** Recherche par nom, même principe que SelecteurPartenaire de
 *  SaisieConcoursEtSuivi.tsx — non partagé directement car ce composant
 *  n'est pas exporté et sa gestion des slots fixes ne correspond pas ici
 *  (nombre d'ambiguïtés variable, pas un nombre de partenaires connu à
 *  l'avance). */
function PickerLicencie({
  licencies,
  exclureIds,
  valeur,
  desactive,
  onChange,
}: {
  licencies: Licencie[];
  exclureIds: number[];
  valeur: number | null;
  desactive: boolean;
  onChange: (id: number | null) => void;
}) {
  const [filtre, setFiltre] = useState('');
  const [ouvert, setOuvert] = useState(false);

  const selectionne = licencies.find((l) => l.id === valeur) ?? null;

  const resultats = useMemo(() => {
    if (!filtre.trim()) return [];
    const q = sansAccentsMinuscules(filtre);
    return licencies
      .filter((l) => !exclureIds.includes(l.id))
      .filter((l) => sansAccentsMinuscules(`${l.prenom} ${l.nom}`).includes(q))
      .slice(0, 8);
  }, [licencies, exclureIds, filtre]);

  if (desactive) {
    return (
      <div className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[13.5px] text-encre-douce opacity-60">
        Ignoré
      </div>
    );
  }

  if (selectionne) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-lg border border-ligne bg-sable px-3 py-2 text-[13.5px]">
        <span>
          {selectionne.prenom} {selectionne.nom}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-[12px] text-terracotta underline"
        >
          Changer
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={filtre}
        onChange={(e) => {
          setFiltre(e.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        placeholder="Rechercher un licencié…"
        className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[13.5px] outline-none focus:border-terracotta"
      />
      {ouvert && resultats.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-lg border border-ligne bg-sable-carte shadow-lg">
          {resultats.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => {
                onChange(l.id);
                setFiltre('');
                setOuvert(false);
              }}
              className="block w-full px-3 py-2 text-left text-[13.5px] hover:bg-sable"
            >
              {l.prenom} {l.nom}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
