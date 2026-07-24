'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { creerManifestation } from '@/lib/actions/manifestations';

export function NouvelleManifestationForm() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const resultat = await creerManifestation({
      nom: String(formData.get('nom') || ''),
      dateDebut: String(formData.get('dateDebut') || ''),
      dateFin: String(formData.get('dateFin') || formData.get('dateDebut') || ''),
      lieu: String(formData.get('lieu') || ''),
      type: String(formData.get('type') || ''),
      notes: String(formData.get('notes') || ''),
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setOuvert(false);
    router.refresh();
    if (resultat.id) router.push(`/manifestations/${resultat.id}`);
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus size={15} />
        Nouvelle manifestation
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree mb-6 flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px]">Nouvelle manifestation</h3>
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
        name="nom"
        required
        placeholder="Nom de la manifestation"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11.5px] text-encre-douce">Date de début</label>
          <input
            type="date"
            name="dateDebut"
            required
            className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] text-encre-douce">Date de fin</label>
          <input
            type="date"
            name="dateFin"
            className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <input
          name="lieu"
          placeholder="Lieu"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <input
          name="type"
          placeholder="Type (ex. Concours, Journée conviviale)"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
      </div>

      <textarea
        name="notes"
        placeholder="Notes (facultatif)"
        rows={2}
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-lg bg-terracotta px-4 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Création…' : 'Créer'}
      </button>
    </form>
  );
}
