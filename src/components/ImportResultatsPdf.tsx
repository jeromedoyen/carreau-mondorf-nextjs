'use client';

import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { extraireResultatsPdf } from '@/lib/actions/matchSheet';
import type { PartieSaisie } from '@/lib/actions/matchSheet';

async function fichierEnBase64(fichier: File): Promise<string> {
  const octets = new Uint8Array(await fichier.arrayBuffer());
  let binaire = '';
  for (let i = 0; i < octets.length; i++) binaire += String.fromCharCode(octets[i]);
  return btoa(binaire);
}

/** Bouton d'import d'un fichier PDF de résultats (28/07/2026, demande
 *  Jérôme, enregistrement audio) — à côté des boutons de forfait. Envoie
 *  le PDF à extraireResultatsPdf() (Gemini, même modèle que Caro) qui en
 *  extrait les 20 lignes de la feuille de match ; le résultat ne fait que
 *  préremplir le formulaire ci-dessous, à relire avant "Enregistrer le
 *  résultat" — l'extraction automatique peut se tromper. */
export function ImportResultatsPdf({
  domicile,
  adversaire,
  onImporter,
}: {
  domicile: boolean;
  adversaire: string;
  onImporter: (lignes: PartieSaisie[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function traiterFichier(fichier: File) {
    setErreur(null);
    setEnCours(true);
    try {
      const pdfBase64 = await fichierEnBase64(fichier);
      const resultat = await extraireResultatsPdf(pdfBase64, { domicile, adversaire });
      if (!resultat.ok) {
        setErreur(resultat.error);
        return;
      }
      onImporter(resultat.lignes);
    } catch (e) {
      setErreur((e as Error).message);
    } finally {
      setEnCours(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-6">
      <h3 className="font-display m-0 mb-2 text-lg">Importer un fichier de résultats</h3>
      <p className="mb-4 text-[13px] text-encre-douce">
        Choisis le PDF de la feuille de match — les 20 lignes sont extraites automatiquement et préremplissent le
        formulaire ci-dessous. Relis-les avant d&apos;enregistrer, l&apos;extraction peut se tromper.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const fichier = e.target.files?.[0];
          if (fichier) traiterFichier(fichier);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={enCours}
        className="inline-flex items-center gap-2 rounded-lg border border-ligne bg-white px-3.5 py-2 text-[13px] font-medium text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-50"
      >
        {enCours ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
        {enCours ? 'Extraction en cours…' : 'Choisir un fichier PDF'}
      </button>

      {erreur && <p className="mt-3 text-[12.5px] text-danger">{erreur}</p>}
    </div>
  );
}
