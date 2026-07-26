'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { creerManifestation } from '@/lib/actions/manifestations';

/** Toujours au boulodrome du club en pratique (confirmé sur les données
 *  existantes, 26/07/2026) — plus la peine de le demander à chaque
 *  création, ça évite une saisie répétitive sans valeur ajoutée. */
const LIEU_PAR_DEFAUT = 'Boulodrome Carreau Mondorf';

/** Types déjà rencontrés dans les données du club — liste déroulante pour
 *  éviter les variantes orthographiques ("Concours international" vs
 *  "Concours international — Boules lyonnaises"), avec repli "Autre" en
 *  texte libre pour ne jamais bloquer un cas non prévu. */
const TYPES_CONNUS = ['Concours international', 'Tournoi interne', 'Festif', 'Championnat'];

export function NouvelleManifestationForm() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [typeAutre, setTypeAutre] = useState(false);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const typeChoisi = String(formData.get('type') || '');
    const resultat = await creerManifestation({
      nom: String(formData.get('nom') || ''),
      dateDebut: String(formData.get('dateDebut') || ''),
      dateFin: String(formData.get('dateFin') || formData.get('dateDebut') || ''),
      lieu: LIEU_PAR_DEFAUT,
      type: typeChoisi === 'Autre' ? String(formData.get('typeAutre') || '') : typeChoisi,
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

      <div>
        <label className="mb-1 block text-[11.5px] text-encre-douce">Type</label>
        <select
          name="type"
          defaultValue=""
          onChange={(e) => setTypeAutre(e.target.value === 'Autre')}
          className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        >
          <option value="" disabled>
            Choisir un type…
          </option>
          {TYPES_CONNUS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          <option value="Autre">Autre…</option>
        </select>
        {typeAutre && (
          <input
            name="typeAutre"
            placeholder="Préciser le type"
            className="mt-2 w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        )}
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
