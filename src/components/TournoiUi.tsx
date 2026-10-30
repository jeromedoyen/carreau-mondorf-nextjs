'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { pdf, type DocumentProps } from '@react-pdf/renderer';

/**
 * Briques d'interface partagées par l'écran de conduite d'un tournoi
 * (`TournoiEcran`) et par l'écran des poules (`TournoiPoulesVues`) : sorties de
 * `TournoiEcran` pour que les deux les utilisent sans dépendance circulaire.
 */

export const CHAMP =
  'rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta';

export const BTN =
  'inline-flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-40';

/** Nom de fichier lisible et triable : « tournoi-2026-08-24-classement.pdf ». */
export function nomFichier(nom: string, date: string, suffixe: string) {
  const base = nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 40);
  return `${base || 'tournoi'}-${date}-${suffixe}.pdf`;
}

/** Le PDF est produit dans le navigateur, comme les fiches membres. */
async function telechargerPdf(document_: React.ReactElement<DocumentProps>, fichier: string) {
  const blob = await pdf(document_).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fichier;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Bouton d'export : garde l'état « génération… », le PDF prend un instant. */
export function BoutonPdf({
  libelle,
  fichier,
  document: doc,
  principal,
}: {
  libelle: string;
  fichier: string;
  document: React.ReactElement<DocumentProps>;
  principal?: boolean;
}) {
  const [enCours, setEnCours] = useState(false);
  return (
    <button
      type="button"
      disabled={enCours}
      onClick={async () => {
        setEnCours(true);
        try {
          await telechargerPdf(doc, fichier);
        } finally {
          setEnCours(false);
        }
      }}
      className={`${BTN} ${principal ? 'bg-terracotta text-white' : 'border border-ligne bg-sable'}`}
    >
      <FileDown size={14} /> {enCours ? 'Génération…' : libelle}
    </button>
  );
}

export function Tab({
  actif,
  onClick,
  children,
}: {
  actif: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px whitespace-nowrap border-b-2 px-3.5 pb-2.5 pt-1 text-[13.5px] transition-colors ${
        actif
          ? 'border-terracotta text-encre'
          : 'border-transparent text-encre-douce hover:text-encre'
      }`}
    >
      {children}
    </button>
  );
}

export function Carte({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <section className="entree rounded-2xl border border-ligne bg-sable-carte p-5">
      <h2 className="font-display mb-3 text-[16px]">{titre}</h2>
      {children}
    </section>
  );
}

/** Signature de la fonction qui lance une action serveur et rafraîchit l'écran (définie dans `TournoiEcran`). */
export type Lancer = (
  action: () => Promise<{ ok: boolean; error?: string }>,
  message?: string,
  onSucces?: () => void,
) => void;
