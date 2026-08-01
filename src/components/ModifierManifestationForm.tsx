'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, X } from 'lucide-react';
import { modifierManifestation } from '@/lib/actions/manifestations';

const TYPES_CONNUS = ['Concours international', 'Tournoi interne', 'Festif', 'Championnat'];

/** Édition nom/type d'une manifestation (demande via /pb, 01/08/2026) —
 *  même liste TYPES_CONNUS + repli "Autre" que NouvelleManifestationForm,
 *  pour rester cohérent avec la saisie initiale. Réservé au CA (même garde
 *  que la création), affiché à côté du titre sur la page détail. */
export function ModifierManifestationForm({
  id,
  nom,
  type,
}: {
  id: number;
  nom: string;
  type: string | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const typeConnu = type && TYPES_CONNUS.includes(type);
  const [typeAutre, setTypeAutre] = useState(!!type && !typeConnu);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const typeChoisi = String(formData.get('type') || '');
    const resultat = await modifierManifestation(id, {
      nom: String(formData.get('nom') || ''),
      type: typeChoisi === 'Autre' ? String(formData.get('typeAutre') || '') : typeChoisi,
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
        aria-label="Modifier la manifestation"
        className="inline-flex items-center gap-1.5 text-[12.5px] text-encre-douce transition-colors hover:text-terracotta"
      >
        <Pencil size={13} />
        Modifier
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree mt-3 flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px]">Modifier la manifestation</h3>
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
        defaultValue={nom}
        placeholder="Nom de la manifestation"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      <div>
        <label className="mb-1 block text-[11.5px] text-encre-douce">Type</label>
        <select
          name="type"
          defaultValue={typeAutre ? 'Autre' : type || ''}
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
            defaultValue={type && !typeConnu ? type : ''}
            placeholder="Préciser le type"
            className="mt-2 w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        )}
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
