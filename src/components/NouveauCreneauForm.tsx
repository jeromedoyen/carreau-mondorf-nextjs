'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { creerCreneau } from '@/lib/actions/manifestations';

const CATEGORIES = ['Buvette', 'Cuisine', 'Terrain', 'Accueil', 'Autre'];

export function NouveauCreneauForm({ manifestationId }: { manifestationId: number }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const resultat = await creerCreneau(manifestationId, {
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
    setOuvert(false);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="mb-4 inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-4 py-2 text-[13px] font-medium text-encre transition-colors hover:border-terracotta"
      >
        <Plus size={15} />
        Ajouter un créneau
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree mb-4 flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px]">Nouveau créneau</h3>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Fermer"
          className="text-encre-douce hover:text-encre"
        >
          <X size={16} />
        </button>
      </div>

      <input
        name="tache"
        required
        placeholder="Tâche (ex. Buvette matin)"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      <div className="grid grid-cols-2 gap-3">
        <select
          name="categorie"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="date"
          required
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <input
          type="time"
          name="heureDebut"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <input
          type="time"
          name="heureFin"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <input
          type="number"
          name="postesPrevus"
          min={1}
          defaultValue={1}
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
        {enCours ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}
