'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { FileText, Download, Send } from 'lucide-react';
import { FichesMembresPdf } from './FichesMembresPdf';
import { envoyerFicheMembreParEmail } from '@/lib/actions/fichesMembres';
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

async function blobEnBase64(blob: Blob): Promise<string> {
  const octets = new Uint8Array(await blob.arrayBuffer());
  let binaire = '';
  for (let i = 0; i < octets.length; i++) binaire += String.fromCharCode(octets[i]);
  return btoa(binaire);
}

type FicheGeneree = {
  id: number;
  fiche: FicheMembre;
  blob: Blob;
  url: string;
  genereLe: Date;
  envoi: 'idle' | 'en_cours' | 'envoye' | 'erreur';
  erreurEnvoi?: string;
};

/** Génération à la demande de la fiche d'une seule personne (28/07/2026,
 *  demande Jérôme, enregistrement audio) — en complément du classeur
 *  complet (GenererFichesMembresBouton.tsx) : une listbox pour choisir la
 *  personne, un PDF généré à la volée, puis un choix télécharger ou
 *  envoyer par email, conservé dans une liste tant que le composant est
 *  monté (pas persisté — juste le temps de la session de travail). */
export function FicheIndividuelleForm({ fiches, annee }: { fiches: FicheMembre[]; annee: string }) {
  const [selectionId, setSelectionId] = useState<string>('');
  const [enCours, setEnCours] = useState(false);
  const [genereesId, setGenereesId] = useState<number[]>([]);
  const [generees, setGenerees] = useState<Record<number, FicheGeneree>>({});

  const triees = [...fiches].sort((a, b) => a.nom.localeCompare(b.nom));

  async function genererFiche() {
    const id = Number(selectionId);
    const fiche = fiches.find((f) => f.id === id);
    if (!fiche) return;
    setEnCours(true);
    try {
      const blob = await pdf(<FichesMembresPdf fiches={[fiche]} annee={annee} />).toBlob();
      const url = URL.createObjectURL(blob);
      setGenerees((prev) => ({ ...prev, [id]: { id, fiche, blob, url, genereLe: new Date(), envoi: 'idle' } }));
      setGenereesId((prev) => [id, ...prev.filter((x) => x !== id)]);
    } finally {
      setEnCours(false);
    }
  }

  async function envoyerParEmail(id: number) {
    const g = generees[id];
    if (!g) return;
    setGenerees((prev) => ({ ...prev, [id]: { ...prev[id], envoi: 'en_cours' } }));
    try {
      const pdfBase64 = await blobEnBase64(g.blob);
      const resultat = await envoyerFicheMembreParEmail({
        destinataire: g.fiche.email ?? '',
        prenom: g.fiche.prenom,
        nom: g.fiche.nom,
        pdfBase64,
      });
      setGenerees((prev) => ({
        ...prev,
        [id]: { ...prev[id], envoi: resultat.ok ? 'envoye' : 'erreur', erreurEnvoi: resultat.ok ? undefined : resultat.error },
      }));
    } catch (e) {
      setGenerees((prev) => ({ ...prev, [id]: { ...prev[id], envoi: 'erreur', erreurEnvoi: (e as Error).message } }));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-2.5">
        <label className="flex flex-col gap-1">
          <span className="text-[11.5px] font-medium text-encre-douce">Fiche d&apos;une seule personne</span>
          <select
            value={selectionId}
            onChange={(e) => setSelectionId(e.target.value)}
            className="min-w-[240px] rounded-lg border border-ligne bg-white px-3 py-2 text-[13px] text-encre outline-none focus:border-terracotta"
          >
            <option value="">Choisir une personne…</option>
            {triees.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nom} {f.prenom}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={genererFiche}
          disabled={!selectionId || enCours}
          className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3.5 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <FileText size={14} />
          {enCours ? 'Génération…' : 'Générer'}
        </button>
      </div>

      {genereesId.length > 0 && (
        <div className="flex flex-col gap-2">
          {genereesId.map((id) => {
            const g = generees[id];
            if (!g) return null;
            return (
              <div key={id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ligne bg-sable-carte px-4 py-2.5">
                <div>
                  <span className="text-[13px] font-medium text-encre">
                    {g.fiche.nom} {g.fiche.prenom}
                  </span>
                  <span className="ml-2 text-[11px] text-encre-douce">
                    généré à {g.genereLe.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => telechargerBlob(g.blob, `Fiche-${g.fiche.nom}-${g.fiche.prenom}.pdf`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ligne bg-white px-2.5 py-1.5 text-[12px] text-encre transition-colors hover:border-terracotta hover:text-terracotta"
                  >
                    <Download size={13} />
                    Télécharger
                  </button>
                  <button
                    type="button"
                    onClick={() => envoyerParEmail(id)}
                    disabled={g.envoi === 'en_cours' || g.envoi === 'envoye' || !g.fiche.email}
                    title={g.fiche.email ?? 'Aucune adresse email pour cette personne'}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ligne bg-white px-2.5 py-1.5 text-[12px] text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-40"
                  >
                    <Send size={13} />
                    {g.envoi === 'en_cours' ? 'Envoi…' : g.envoi === 'envoye' ? 'Envoyé ✓' : 'Envoyer par email'}
                  </button>
                </div>
                {g.envoi === 'erreur' && <p className="w-full text-[11.5px] text-danger">{g.erreurEnvoi}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
