'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { modifierCreneau } from '@/lib/actions/manifestations';
import { CATEGORIES_CRENEAU } from '@/lib/categoriesCreneau';

/** Formulaire d'édition d'un créneau/tâche existant — nom, catégorie, date,
 *  horaires, postes prévus. Réservé au CA (rendu conditionnellement par
 *  l'appelant), même liste CATEGORIES_CRENEAU que la création
 *  (NouveauCreneauForm.tsx). Bascule affichage/édition pilotée par le
 *  parent (CreneauCard.tsx) via `onFerme`, pas d'état d'ouverture propre. */
export function ModifierCreneauForm({
  manifestationId,
  id,
  tache,
  categorie,
  date,
  heureDebut,
  heureFin,
  postesPrevus,
  onFerme,
}: {
  manifestationId: number;
  id: number;
  tache: string;
  categorie: string;
  date: string;
  heureDebut: string | null;
  heureFin: string | null;
  postesPrevus: number;
  onFerme: () => void;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const resultat = await modifierCreneau(manifestationId, id, {
      tache: String(formData.get('tache') || ''),
      categorie: String(formData.get('categorie') || 'Autre'),
      date: String(formData.get('date') || ''),
      heureDebut: String(formData.get('heureDebut') || ''),
      heureFin: String(formData.get('heureFin') || ''),
      postesPrevus: Number(formData.get('postesPrevus') || 1),
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    onFerme();
    router.refresh();
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h4 className="font-display text-[13.5px]">Modifier la tâche</h4>
        <button
          type="button"
          onClick={onFerme}
          aria-label="Fermer"
          className="text-encre-douce hover:text-encre"
        >
          <X size={15} />
        </button>
      </div>

      <input
        name="tache"
        required
        defaultValue={tache}
        placeholder="Tâche (ex. Buvette matin)"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          name="categorie"
          defaultValue={categorie}
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        >
          {CATEGORIES_CRENEAU.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="date"
          required
          defaultValue={date.slice(0, 10)}
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input
          type="time"
          name="heureDebut"
          defaultValue={heureDebut || ''}
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <input
          type="time"
          name="heureFin"
          defaultValue={heureFin || ''}
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <input
          type="number"
          name="postesPrevus"
          min={1}
          defaultValue={postesPrevus}
          aria-label="Postes prévus"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
      </div>

      {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-lg bg-terracotta px-4 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Enregistrement…' : 'Enregistrer'}
      </button>
    </form>
  );
}
