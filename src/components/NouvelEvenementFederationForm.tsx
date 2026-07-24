'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { creerEvenementFederation } from '@/lib/actions/federation';

const CATEGORIES = ['Tournoi', 'Promotion', 'Championnat national', 'Coupe de Luxembourg'];

export function NouvelEvenementFederationForm() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const resultat = await creerEvenementFederation({
      libelle: String(formData.get('libelle') || ''),
      date: String(formData.get('date') || ''),
      dateFin: String(formData.get('dateFin') || ''),
      categorie: String(formData.get('categorie') || ''),
      lieu: String(formData.get('lieu') || ''),
      domicile: String(formData.get('domicile') || ''),
      concerneClub: formData.get('concerneClub') === 'on',
      notes: String(formData.get('notes') || ''),
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
        className="inline-flex items-center gap-2 rounded-full bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90"
      >
        <Plus size={15} />
        Ajouter un événement
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree mb-6 flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px]">Nouvel événement fédération</h3>
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
        name="libelle"
        required
        placeholder="Libellé (ex. Promotion à Schieren (J1))"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[11.5px] text-encre-douce">Date</label>
          <input
            type="date"
            name="date"
            required
            className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11.5px] text-encre-douce">Date de fin (facultatif)</label>
          <input
            type="date"
            name="dateFin"
            className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          name="categorie"
          required
          defaultValue=""
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        >
          <option value="" disabled>
            Catégorie…
          </option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          name="domicile"
          defaultValue=""
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        >
          <option value="">Domicile ?</option>
          <option value="Oui">Domicile</option>
          <option value="Non">Extérieur</option>
        </select>
      </div>

      <input
        name="lieu"
        placeholder="Lieu"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      <label className="flex items-center gap-2 text-[13px] text-encre-douce">
        <input type="checkbox" name="concerneClub" className="h-4 w-4 accent-terracotta" />
        Concerne le club (le club y participe)
      </label>

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
        {enCours ? 'Ajout…' : 'Ajouter'}
      </button>
    </form>
  );
}
