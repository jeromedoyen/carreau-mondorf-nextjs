'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { creerConge } from '@/lib/actions/conges';
import { MEMBRES_CA } from '@/lib/membresCA';

export function NouveauCongeForm() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const resultat = await creerConge({
      personne: String(formData.get('personne') || ''),
      dateDebut: String(formData.get('dateDebut') || ''),
      dateFin: String(formData.get('dateFin') || formData.get('dateDebut') || ''),
      motif: String(formData.get('motif') || ''),
      note: String(formData.get('note') || ''),
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
        Déclarer un congé
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree mb-6 flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px]">Déclarer un congé</h3>
        <button
          type="button"
          onClick={() => setOuvert(false)}
          aria-label="Fermer"
          className="text-encre-douce hover:text-encre"
        >
          <X size={16} />
        </button>
      </div>

      <select
        name="personne"
        required
        defaultValue=""
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      >
        <option value="" disabled>
          Membre du CA…
        </option>
        {MEMBRES_CA.map((m) => (
          <option key={m.nom} value={m.nom}>
            {m.nom} — {m.role}
          </option>
        ))}
      </select>

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

      <input
        name="motif"
        placeholder="Motif (ex. Vacances, Indisponible)"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />
      <textarea
        name="note"
        placeholder="Note (facultatif)"
        rows={2}
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

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
