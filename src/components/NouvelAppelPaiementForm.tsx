'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { creerAppelPaiement } from '@/lib/actions/paiements';
import type { ParametresClub, TypeAppelPaiement } from '@/lib/paiements';

export function NouvelAppelPaiementForm({
  personnes,
  parametres,
}: {
  personnes: { id: number; nom: string }[];
  parametres: ParametresClub | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [montant, setMontant] = useState('');

  // Pense-bête 27/07/2026 : préremplir le montant selon le type choisi, à
  // partir des tarifs configurés sur ce même écran (Coordonnées bancaires
  // du club) — reste modifiable manuellement ensuite (ex. tarif réduit).
  function surChangementType(type: TypeAppelPaiement) {
    const carte = parametres?.montantCarteMembre ?? null;
    const licence = parametres?.montantLicence ?? null;
    if (type === 'Carte de membre' && carte != null) setMontant(String(carte));
    else if (type === 'Licence' && licence != null) setMontant(String(licence));
    else if (type === 'Carte de membre + Licence' && (carte != null || licence != null)) {
      setMontant(String((carte ?? 0) + (licence ?? 0)));
    } else {
      setMontant('');
    }
  }

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const personneId = String(formData.get('personneId') || '');
    const resultat = await creerAppelPaiement({
      personneId: personneId ? Number(personneId) : undefined,
      type: String(formData.get('type') || 'Autre') as TypeAppelPaiement,
      montant: Number(formData.get('montant') || 0),
      description: String(formData.get('description') || ''),
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setOuvert(false);
    setMontant('');
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => {
          setOuvert(true);
          surChangementType('Carte de membre');
        }}
        className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-4 py-2 text-[13px] font-medium text-encre transition-colors hover:border-terracotta"
      >
        <Plus size={15} />
        Nouvel appel de paiement
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px]">Nouvel appel de paiement</h3>
        <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="text-encre-douce hover:text-encre">
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <select
          name="type"
          defaultValue="Carte de membre"
          onChange={(e) => surChangementType(e.target.value as TypeAppelPaiement)}
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        >
          <option value="Carte de membre">Carte de membre</option>
          <option value="Licence">Licence</option>
          <option value="Carte de membre + Licence">Carte de membre + Licence</option>
          <option value="Autre">Autre</option>
        </select>
        <input
          type="number"
          name="montant"
          step="0.01"
          min="0.01"
          required
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          placeholder="Montant (EUR)"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
      </div>

      <select
        name="personneId"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      >
        <option value="">— Pas lié à une fiche —</option>
        {personnes.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nom}
          </option>
        ))}
      </select>

      <input
        name="description"
        required
        placeholder="Description (ex. Cotisation 2026)"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-lg bg-terracotta px-4 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Création…' : "Créer l'appel"}
      </button>
    </form>
  );
}
