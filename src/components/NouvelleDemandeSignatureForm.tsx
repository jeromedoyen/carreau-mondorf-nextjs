'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, FileText, UserPlus } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { creerDemandeSignature } from '@/lib/actions/signatures';

/** Upload direct navigateur → Supabase Storage (même client de session
 *  que le reste de l'app, RLS "CA ecriture documents-signature" appliquée
 *  normalement) plutôt qu'un transit par Server Action : un File n'a rien
 *  à faire de plus simple à transporter côté serveur ici, et Jérôme avait
 *  lui-même décrit ce flux ("uploader le fichier directement depuis le
 *  navigateur"). Une fois le fichier en place, creerDemandeSignature() ne
 *  fait que créer les lignes en base avec le chemin obtenu.
 *
 *  Signataire "manuel" (27/07/2026) : en plus des membres du CA
 *  (signataires_ca()), on peut ajouter n'importe quel email/nom à la
 *  volée — pensé pour tester avec le compte fictif Jean Testeur sans
 *  solliciter tout le CA pour un simple essai, mais reste utile pour un
 *  vrai signataire externe le cas échéant. */
export function NouvelleDemandeSignatureForm({ signataires }: { signataires: { email: string; nom: string }[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choisis, setChoisis] = useState<string[]>([]);
  const [manuels, setManuels] = useState<{ email: string; nom: string }[]>([]);
  const [emailManuel, setEmailManuel] = useState('');
  const [nomManuel, setNomManuel] = useState('');

  function basculer(email: string) {
    setChoisis((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  }

  function ajouterManuel() {
    const email = emailManuel.trim().toLowerCase();
    const nom = nomManuel.trim();
    if (!email || !nom) return;
    if (manuels.some((m) => m.email === email) || signataires.some((s) => s.email === email)) return;
    setManuels((prev) => [...prev, { email, nom }]);
    setEmailManuel('');
    setNomManuel('');
  }

  function retirerManuel(email: string) {
    setManuels((prev) => prev.filter((m) => m.email !== email));
  }

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);

    const fd = new FormData(e.currentTarget);
    const titre = String(fd.get('titre') || '').trim();
    const fichier = fd.get('fichier') as File | null;

    const tousSignataires = [...signataires.filter((s) => choisis.includes(s.email)), ...manuels];

    if (!titre) return setErreur('Titre obligatoire.');
    if (!fichier || fichier.size === 0) return setErreur('Choisis un fichier PDF.');
    if (fichier.type !== 'application/pdf') return setErreur('Le fichier doit être un PDF.');
    if (tousSignataires.length === 0) return setErreur('Choisis au moins un signataire.');

    setEnCours(true);

    const supabase = createClient();
    const chemin = `${Date.now()}-${fichier.name.replace(/[^\w.\-]/g, '_')}`;
    const { error: errUpload } = await supabase.storage.from('documents-signature').upload(chemin, fichier);
    if (errUpload) {
      setEnCours(false);
      setErreur(`Échec de l'upload : ${errUpload.message}`);
      return;
    }

    const resultat = await creerDemandeSignature({
      titre,
      cheminStorage: chemin,
      signataires: tousSignataires,
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setOuvert(false);
    setChoisis([]);
    setManuels([]);
    router.refresh();
  }

  if (!ouvert) {
    return (
      <button
        type="button"
        onClick={() => setOuvert(true)}
        className="inline-flex items-center gap-2 rounded-full border border-ligne bg-sable-carte px-4 py-2 text-[13px] font-medium text-encre transition-colors hover:border-terracotta"
      >
        <Plus size={15} />
        Nouvelle demande de signature
      </button>
    );
  }

  return (
    <form
      onSubmit={soumettre}
      className="entree flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display text-[15px]">Nouvelle demande de signature</h3>
        <button type="button" onClick={() => setOuvert(false)} aria-label="Fermer" className="text-encre-douce hover:text-encre">
          <X size={16} />
        </button>
      </div>

      <input
        name="titre"
        required
        placeholder="Titre (ex. PV CA du 25/07/2026)"
        className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
      />

      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-ligne bg-sable px-3 py-2.5 text-[13.5px] text-encre-douce hover:border-terracotta">
        <FileText size={16} />
        <input name="fichier" type="file" accept="application/pdf" required className="text-[13px]" />
      </label>

      <div>
        <p className="mb-1.5 text-[12.5px] text-encre-douce">Signataires</p>
        <div className="flex flex-col gap-1.5 rounded-lg border border-ligne bg-sable p-2.5">
          {signataires.map((s) => (
            <label key={s.email} className="flex items-center gap-2 text-[13.5px] text-encre">
              <input
                type="checkbox"
                checked={choisis.includes(s.email)}
                onChange={() => basculer(s.email)}
                className="h-4 w-4 accent-terracotta"
              />
              {s.nom}
            </label>
          ))}
          {manuels.map((m) => (
            <div key={m.email} className="flex items-center justify-between gap-2 text-[13.5px] text-encre">
              <span>
                {m.nom} <span className="text-encre-douce">({m.email})</span>
              </span>
              <button
                type="button"
                onClick={() => retirerManuel(m.email)}
                aria-label={`Retirer ${m.nom}`}
                className="text-encre-douce/60 hover:text-danger"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={nomManuel}
            onChange={(e) => setNomManuel(e.target.value)}
            placeholder="Nom (ex. Jean Testeur)"
            className="min-w-0 flex-1 rounded-lg border border-ligne bg-sable px-2.5 py-1.5 text-[13px] outline-none focus:border-terracotta"
          />
          <input
            type="email"
            value={emailManuel}
            onChange={(e) => setEmailManuel(e.target.value)}
            placeholder="email"
            className="min-w-0 flex-1 rounded-lg border border-ligne bg-sable px-2.5 py-1.5 text-[13px] outline-none focus:border-terracotta"
          />
          <button
            type="button"
            onClick={ajouterManuel}
            className="inline-flex items-center gap-1 rounded-lg border border-ligne px-2.5 py-1.5 text-[12.5px] text-encre-douce hover:border-terracotta hover:text-terracotta"
          >
            <UserPlus size={13} />
            Ajouter
          </button>
        </div>
      </div>

      {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-lg bg-terracotta px-4 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Création…' : 'Créer la demande'}
      </button>
    </form>
  );
}
