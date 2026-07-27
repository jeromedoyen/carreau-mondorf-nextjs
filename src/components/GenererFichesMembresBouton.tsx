'use client';

import { useState } from 'react';
import { FileDown, FileJson } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import { FichesMembresPdf } from './FichesMembresPdf';
import type { FicheMembre } from '@/lib/fichesMembres';

function telechargerBlob(blob: Blob, nomFichier: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Deux formats en sortie (27/07/2026, demande Jérôme) : le classeur PDF
 *  pour impression ("les anciens croient au papier"), et un export
 *  JSON/CSV pour tout usage informatique ultérieur — mêmes données,
 *  générées côté navigateur à partir des fiches déjà chargées par la page
 *  (Server Component), pas de nouvel aller-retour serveur. */
export function GenererFichesMembresBouton({ fiches, annee }: { fiches: FicheMembre[]; annee: string }) {
  const [formatEnCours, setFormatEnCours] = useState<'pdf' | 'json' | 'csv' | null>(null);

  async function genererPdf() {
    setFormatEnCours('pdf');
    try {
      const blob = await pdf(<FichesMembresPdf fiches={fiches} annee={annee} />).toBlob();
      telechargerBlob(blob, `Fiches-membres-${annee}.pdf`);
    } finally {
      setFormatEnCours(null);
    }
  }

  function genererJson() {
    setFormatEnCours('json');
    try {
      const contenu = JSON.stringify({ saison: annee, fiches }, null, 2);
      telechargerBlob(new Blob([contenu], { type: 'application/json' }), `Fiches-membres-${annee}.json`);
    } finally {
      setFormatEnCours(null);
    }
  }

  function genererCsv() {
    setFormatEnCours('csv');
    try {
      const colonnes = [
        'nom',
        'prenom',
        'date_naissance',
        'sexe',
        'nationalite',
        'adresse',
        'code_postal_ville',
        'telephone',
        'email',
        'type_adhesion',
        'categorie',
        'numero_licence',
        'cotisation_payee',
        'cotisation_date',
        'cotisation_montant',
        'licence_payee',
        'licence_date',
        'licence_montant',
      ];
      function echapper(valeur: unknown): string {
        const s = valeur === null || valeur === undefined ? '' : String(valeur);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }
      const lignes = fiches.map((f) =>
        [
          f.nom,
          f.prenom,
          f.dateNaissance,
          f.sexe,
          f.nationalite,
          f.adresse,
          f.codePostalVille,
          f.telephone,
          f.email,
          f.adhesion?.type,
          f.adhesion?.categorie,
          f.adhesion?.licence,
          f.adhesion?.cotisationPayee,
          f.adhesion?.cotisationDate,
          f.adhesion?.cotisationMontant,
          f.adhesion?.licencePayee,
          f.adhesion?.licenceDate,
          f.adhesion?.licenceMontant,
        ]
          .map(echapper)
          .join(',')
      );
      const contenu = [colonnes.join(','), ...lignes].join('\n');
      telechargerBlob(new Blob([`﻿${contenu}`], { type: 'text/csv' }), `Fiches-membres-${annee}.csv`);
    } finally {
      setFormatEnCours(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={genererPdf}
        disabled={formatEnCours !== null || fiches.length === 0}
        className="inline-flex flex-col items-start gap-0.5 rounded-lg bg-terracotta px-4 py-2.5 text-left text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium">
          <FileDown size={14} />
          {formatEnCours === 'pdf' ? 'Génération…' : 'Générer le classeur PDF'}
        </span>
        <span className="text-[11px] opacity-85">un fichier, une page par personne, trié par nom</span>
      </button>

      <button
        type="button"
        onClick={genererJson}
        disabled={formatEnCours !== null || fiches.length === 0}
        className="inline-flex flex-col items-start gap-0.5 rounded-lg border border-ligne bg-sable-carte px-4 py-2.5 text-left text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-40"
      >
        <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium">
          <FileJson size={14} />
          {formatEnCours === 'json' ? 'Génération…' : 'Exporter en JSON'}
        </span>
        <span className="text-[11px] opacity-70">toutes les fiches, format machine</span>
      </button>

      <button
        type="button"
        onClick={genererCsv}
        disabled={formatEnCours !== null || fiches.length === 0}
        className="inline-flex flex-col items-start gap-0.5 rounded-lg border border-ligne bg-sable-carte px-4 py-2.5 text-left text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-40"
      >
        <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium">
          <FileJson size={14} />
          {formatEnCours === 'csv' ? 'Génération…' : 'Exporter en CSV'}
        </span>
        <span className="text-[11px] opacity-70">une ligne par personne, tableur</span>
      </button>
    </div>
  );
}
