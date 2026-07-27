'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, FileText } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { creerDemandeSignature } from '@/lib/actions/signatures';

/** Upload direct navigateur → Supabase Storage (même client de session
 *  que le reste de l'app, RLS "CA ecriture documents-signature" appliquée
 *  normalement) plutôt qu'un transit par Server Action : un File n'a rien
 *  à faire de plus simple à transporter côté serveur ici, et Jérôme avait
 *  lui-même décrit ce flux ("uploader le fichier directement depuis le
 *  navigateur"). Une fois le fichier en place, creerDemandeSignature() ne
 *  fait que créer les lignes en base avec le chemin obtenu. */
export function NouvelleDemandeSignatureForm({ signataires }: { signataires: { email: string; nom: string }[] }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [choisis, setChoisis] = useState<string[]>([]);

  function basculer(email: string) {
    setChoisis((prev) => (prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]));
  }

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);

    const fd = new FormData(e.currentTarget);
    const titre = String(fd.get('titre') || '').trim();
    const fichier = fd.get('fichier') as File | null;

    if (!titre) return setErreur('Titre obligatoire.');
    if (!fichier || fichier.size === 0) return setErreur('Choisis un fichier PDF.');
    if (fichier.type !== 'application/pdf') return setErreur('Le fichier doit être un PDF.');
    if (choisis.length === 0) return setErreur('Choisis au moins un signataire.');

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
      signataires: signataires.filter((s) => choisis.includes(s.email)),
    });
    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setOuvert(false);
    setChoisis([]);
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
