'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, X } from 'lucide-react';
import { modifierManifestation, supprimerManifestation } from '@/lib/actions/manifestations';

const TYPES_CONNUS = ['Concours international', 'Tournoi interne', 'Festif', 'Championnat'];
const STATUTS_CONNUS = ['Planifiée', 'Confirmée', 'Annulée', 'Terminée'];

/** Édition nom/type/statut d'une manifestation (demande via /pb, 01/08/2026,
 *  statut ajouté suite à la note #105 : possibilité de revenir en arrière
 *  si une manifestation a été marquée "Terminée" par erreur — jusqu'ici
 *  aucun code ne modifiait jamais ce champ après sa valeur par défaut
 *  'Planifiée' à la création). Même liste TYPES_CONNUS + repli "Autre" que
 *  NouvelleManifestationForm. Réservé au CA (même garde que la création).
 *
 *  Modifier/Supprimer sont deux boutons indépendants (note #104 : le bouton
 *  Modifier était un simple lien texte peu visible, et Supprimer n'était
 *  accessible qu'après avoir ouvert le formulaire d'édition) : Supprimer
 *  a sa propre confirmation en ligne, sans passer par le formulaire. */
export function ModifierManifestationForm({
  id,
  nom,
  type,
  statut,
  dateDebut,
  dateFin,
}: {
  id: number;
  nom: string;
  type: string | null;
  statut: string;
  dateDebut: string;
  dateFin: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmerSuppression, setConfirmerSuppression] = useState(false);
  const [suppressionEnCours, setSuppressionEnCours] = useState(false);
  const typeConnu = type && TYPES_CONNUS.includes(type);
  const [typeAutre, setTypeAutre] = useState(!!type && !typeConnu);

  async function supprimer() {
    setSuppressionEnCours(true);
    setErreur(null);
    const resultat = await supprimerManifestation(id);
    setSuppressionEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    router.push('/manifestations');
    router.refresh();
  }

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const formData = new FormData(e.currentTarget);
    const typeChoisi = String(formData.get('type') || '');
    const resultat = await modifierManifestation(id, {
      nom: String(formData.get('nom') || ''),
      type: typeChoisi === 'Autre' ? String(formData.get('typeAutre') || '') : typeChoisi,
      statut: String(formData.get('statut') || ''),
      dateDebut: String(formData.get('dateDebut') || ''),
      dateFin: String(formData.get('dateFin') || ''),
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
    <div className="mt-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOuvert((v) => !v)}
          aria-label="Modifier la manifestation"
          className="inline-flex items-center gap-1.5 rounded-full border border-ligne bg-sable-carte px-3.5 py-1.5 text-[13px] font-medium text-encre-douce transition-colors hover:border-terracotta hover:text-terracotta"
        >
          <Pencil size={13} />
          Modifier
        </button>

        {confirmerSuppression ? (
          <div className="flex items-center gap-2 text-[12.5px]">
            <span className="text-encre-douce">Supprimer définitivement ?</span>
            <button
              type="button"
              onClick={supprimer}
              disabled={suppressionEnCours}
              className="rounded-lg bg-danger px-3 py-1.5 font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {suppressionEnCours ? 'Suppression…' : 'Confirmer'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmerSuppression(false)}
              className="text-encre-douce underline hover:text-encre"
            >
              Annuler
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmerSuppression(true)}
            aria-label="Supprimer la manifestation"
            className="inline-flex items-center gap-1.5 rounded-full border border-ligne bg-sable-carte px-3.5 py-1.5 text-[13px] font-medium text-encre-douce transition-colors hover:border-danger hover:text-danger"
          >
            <Trash2 size={13} />
            Supprimer
          </button>
        )}
      </div>

      {erreur && !ouvert && <p className="mt-2 text-[12.5px] text-danger">{erreur}</p>}

      {ouvert && (
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[11.5px] text-encre-douce">Date de début</label>
              <input
                type="date"
                name="dateDebut"
                required
                defaultValue={dateDebut.slice(0, 10)}
                className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11.5px] text-encre-douce">Date de fin</label>
              <input
                type="date"
                name="dateFin"
                required
                defaultValue={dateFin.slice(0, 10)}
                className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] text-encre-douce">Statut</label>
            <select
              name="statut"
              defaultValue={statut}
              className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
            >
              {STATUTS_CONNUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
