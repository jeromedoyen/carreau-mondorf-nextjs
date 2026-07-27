'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Landmark, ChevronDown } from 'lucide-react';
import { enregistrerParametresClub } from '@/lib/actions/paiements';
import type { ParametresClub } from '@/lib/paiements';

export function ParametresClubForm({ parametres }: { parametres: ParametresClub | null }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(!parametres);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function enregistrer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const montantCarteMembre = Number(formData.get('montantCarteMembre') || 0);
    const montantLicence = Number(formData.get('montantLicence') || 0);
    const resultat = await enregistrerParametresClub({
      nomBeneficiaire: String(formData.get('nomBeneficiaire') || ''),
      iban: String(formData.get('iban') || ''),
      bic: String(formData.get('bic') || ''),
      ville: String(formData.get('ville') || ''),
      montantCarteMembre: montantCarteMembre > 0 ? montantCarteMembre : undefined,
      montantLicence: montantLicence > 0 ? montantLicence : undefined,
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setOuvert(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-5">
      <button
        type="button"
        onClick={() => setOuvert((v) => !v)}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-center gap-2">
          <Landmark size={16} className="text-pin" />
          <span className="font-display text-[15px]">Coordonnées bancaires du club</span>
        </span>
        <ChevronDown size={16} className={`text-encre-douce transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>

      {!ouvert && parametres && (
        <p className="mt-2 text-[12.5px] text-encre-douce">
          {parametres.nomBeneficiaire} · {parametres.iban}
          {parametres.bic ? ` · ${parametres.bic}` : ''}
        </p>
      )}
      {!ouvert && !parametres && (
        <p className="mt-2 text-[12.5px] text-danger">Aucune coordonnée enregistrée — les QR ne peuvent pas être générés.</p>
      )}

      {ouvert && (
        <form onSubmit={enregistrer} className="mt-4 flex flex-col gap-3">
          <input
            name="nomBeneficiaire"
            required
            defaultValue={parametres?.nomBeneficiaire ?? ''}
            placeholder="Bénéficiaire (ex. Carreau Mondorf ASBL)"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              name="iban"
              required
              defaultValue={parametres?.iban ?? ''}
              placeholder="IBAN"
              className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
            <input
              name="bic"
              defaultValue={parametres?.bic ?? ''}
              placeholder="BIC (optionnel)"
              className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            />
          </div>
          <input
            name="ville"
            defaultValue={parametres?.ville ?? ''}
            placeholder="Ville (optionnel)"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11.5px] text-encre-douce">Montant carte de membre (EUR)</label>
              <input
                type="number"
                name="montantCarteMembre"
                step="0.01"
                min="0"
                defaultValue={parametres?.montantCarteMembre ?? ''}
                placeholder="20"
                className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] text-encre-douce">Montant licence (EUR)</label>
              <input
                type="number"
                name="montantLicence"
                step="0.01"
                min="0"
                defaultValue={parametres?.montantLicence ?? ''}
                placeholder="Fixé par la FLBP"
                className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
              />
            </div>
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
      )}
    </div>
  );
}
