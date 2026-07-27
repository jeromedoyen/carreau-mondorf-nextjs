'use client';

import { useState } from 'react';
import { FileDown, FileJson, FileArchive } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import JSZip from 'jszip';
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

function contenuJson(fiches: FicheMembre[], annee: string): string {
  return JSON.stringify({ saison: annee, fiches }, null, 2);
}

const COLONNES_CSV = [
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
] as const;

function echapperCsv(valeur: unknown): string {
  const s = valeur === null || valeur === undefined ? '' : String(valeur);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function contenuCsv(fiches: FicheMembre[]): string {
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
      .map(echapperCsv)
      .join(',')
  );
  // BOM (﻿) pour qu'Excel reconnaisse l'UTF-8 sans le demander explicitement.
  return `﻿${[COLONNES_CSV.join(','), ...lignes].join('\n')}`;
}

/** Quatre formats en sortie (27/07/2026, demande Jérôme) : le classeur PDF
 *  pour impression ("les anciens croient au papier"), JSON/CSV pour tout
 *  usage informatique, et un ZIP qui regroupe les trois — tout généré côté
 *  navigateur à partir des fiches déjà chargées par la page (Server
 *  Component), pas de nouvel aller-retour serveur. */
export function GenererFichesMembresBouton({ fiches, annee }: { fiches: FicheMembre[]; annee: string }) {
  const [formatEnCours, setFormatEnCours] = useState<'pdf' | 'json' | 'csv' | 'zip' | null>(null);

  async function genererPdfBlob(): Promise<Blob> {
    return pdf(<FichesMembresPdf fiches={fiches} annee={annee} />).toBlob();
  }

  async function genererPdf() {
    setFormatEnCours('pdf');
    try {
      telechargerBlob(await genererPdfBlob(), `Fiches-membres-${annee}.pdf`);
    } finally {
      setFormatEnCours(null);
    }
  }

  function genererJson() {
    setFormatEnCours('json');
    try {
      telechargerBlob(new Blob([contenuJson(fiches, annee)], { type: 'application/json' }), `Fiches-membres-${annee}.json`);
    } finally {
      setFormatEnCours(null);
    }
  }

  function genererCsv() {
    setFormatEnCours('csv');
    try {
      telechargerBlob(new Blob([contenuCsv(fiches)], { type: 'text/csv' }), `Fiches-membres-${annee}.csv`);
    } finally {
      setFormatEnCours(null);
    }
  }

  async function genererZip() {
    setFormatEnCours('zip');
    try {
      const zip = new JSZip();
      zip.file(`Fiches-membres-${annee}.pdf`, await genererPdfBlob());
      zip.file(`Fiches-membres-${annee}.json`, contenuJson(fiches, annee));
      zip.file(`Fiches-membres-${annee}.csv`, contenuCsv(fiches));
      const blob = await zip.generateAsync({ type: 'blob' });
      telechargerBlob(blob, `Fiches-membres-${annee}.zip`);
    } finally {
      setFormatEnCours(null);
    }
  }

  const desactive = formatEnCours !== null || fiches.length === 0;

  return (
    <div className="flex flex-wrap gap-2.5">
      <button
        type="button"
        onClick={genererPdf}
        disabled={desactive}
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
        disabled={desactive}
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
        disabled={desactive}
        className="inline-flex flex-col items-start gap-0.5 rounded-lg border border-ligne bg-sable-carte px-4 py-2.5 text-left text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-40"
      >
        <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium">
          <FileJson size={14} />
          {formatEnCours === 'csv' ? 'Génération…' : 'Exporter en CSV'}
        </span>
        <span className="text-[11px] opacity-70">une ligne par personne, tableur</span>
      </button>

      <button
        type="button"
        onClick={genererZip}
        disabled={desactive}
        className="inline-flex flex-col items-start gap-0.5 rounded-lg border border-ligne bg-sable-carte px-4 py-2.5 text-left text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-40"
      >
        <span className="inline-flex items-center gap-1.5 text-[13.5px] font-medium">
          <FileArchive size={14} />
          {formatEnCours === 'zip' ? 'Génération…' : 'Tout télécharger (ZIP)'}
        </span>
        <span className="text-[11px] opacity-70">PDF + JSON + CSV dans une archive</span>
      </button>
    </div>
  );
}
