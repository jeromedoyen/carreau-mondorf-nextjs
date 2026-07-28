'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, Check, X, Download, Upload, FolderUp, FileDown, ExternalLink, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  envoyerDemandeSignature,
  marquerSignataireSigne,
  enregistrerPdfSigne,
  annulerDemandeSignature,
  obtenirUrlDocument,
  archiverDansGoogleDrive,
  recupererEtArchiverSignature,
  supprimerDemandeSignature,
} from '@/lib/actions/signatures';
import type { DemandeSignature } from '@/lib/signatures';

const STATUT_COULEUR: Record<string, string> = {
  en_attente: 'bg-terracotta/10 text-terracotta',
  en_cours: 'bg-marine/15 text-marine',
  complete: 'bg-succes/15 text-succes',
  annulee: 'bg-encre-douce/15 text-encre-douce',
};
const STATUT_LABEL: Record<string, string> = {
  en_attente: 'En attente d’envoi',
  en_cours: 'En cours de signature',
  complete: 'Signé',
  annulee: 'Annulée',
};

/** Envoi automatisé via l'API Documenso (27/07/2026, contrairement à
 *  DocuSeal dont l'API self-hosted est réservée au Pro) — le pointage
 *  manuel du "qui a signé" reste disponible en complément (pas de webhook
 *  branché pour l'instant, le CA vérifie dans Documenso puis reporte ici). */
export function ListeDemandesSignature({ demandes }: { demandes: DemandeSignature[] }) {
  const router = useRouter();
  const [enCours, setEnCours] = useState<number | null>(null);
  const [erreur, setErreur] = useState<{ id: number; message: string } | null>(null);

  async function envoyer(id: number) {
    setErreur(null);
    setEnCours(id);
    const resultat = await envoyerDemandeSignature(id);
    setEnCours(null);
    if (!resultat.ok) setErreur({ id, message: resultat.error });
    router.refresh();
  }

  async function marquerSigne(signataireId: number) {
    await marquerSignataireSigne(signataireId);
    router.refresh();
  }

  async function annuler(id: number) {
    await annulerDemandeSignature(id);
    router.refresh();
  }

  async function supprimer(id: number, titre: string) {
    if (!window.confirm(`Supprimer « ${titre} » de la liste ? L'action reste tracée dans le journal.`)) return;
    setErreur(null);
    setEnCours(id);
    const resultat = await supprimerDemandeSignature(id);
    setEnCours(null);
    if (!resultat.ok) setErreur({ id, message: resultat.error });
    router.refresh();
  }

  async function televerserSigne(demande: DemandeSignature, fichier: File) {
    setErreur(null);
    setEnCours(demande.id);
    const supabase = createClient();
    const chemin = `signe-${demande.id}-${Date.now()}.pdf`;
    const { error: errUpload } = await supabase.storage.from('documents-signature').upload(chemin, fichier);
    if (errUpload) {
      setEnCours(null);
      setErreur({ id: demande.id, message: `Échec de l'upload : ${errUpload.message}` });
      return;
    }
    const resultat = await enregistrerPdfSigne(demande.id, chemin);
    setEnCours(null);
    if (!resultat.ok) setErreur({ id: demande.id, message: resultat.error });
    router.refresh();
  }

  async function telecharger(chemin: string) {
    const resultat = await obtenirUrlDocument(chemin);
    if (resultat.ok) window.open(resultat.url, '_blank');
  }

  async function archiver(id: number) {
    setErreur(null);
    setEnCours(id);
    const resultat = await archiverDansGoogleDrive(id);
    setEnCours(null);
    if (!resultat.ok) setErreur({ id, message: resultat.error });
    router.refresh();
  }

  async function recupererEtArchiver(id: number) {
    setErreur(null);
    setEnCours(id);
    const resultat = await recupererEtArchiverSignature(id);
    setEnCours(null);
    if (!resultat.ok) setErreur({ id, message: resultat.error });
    router.refresh();
  }

  if (demandes.length === 0) {
    return <p className="text-[14px] text-encre-douce">Aucune demande de signature pour l&apos;instant.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {demandes.map((d) => (
        <div key={d.id} className="rounded-2xl border border-ligne bg-sable-carte p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-[14.5px]">{d.titre}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUT_COULEUR[d.statut]}`}>
                  {STATUT_LABEL[d.statut]}
                </span>
                <button
                  type="button"
                  onClick={() => supprimer(d.id, d.titre)}
                  disabled={enCours === d.id}
                  aria-label="Supprimer de la liste"
                  title="Supprimer de la liste"
                  className="ml-auto text-encre-douce/50 hover:text-danger disabled:opacity-40"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="mt-1 flex flex-col gap-0.5">
                {d.signataires.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 text-[12.5px] text-encre-douce">
                    <span>
                      {s.nom} {s.signeLe ? <span className="text-succes">✓ signé</span> : null}
                    </span>
                    {d.statut === 'en_cours' && !s.signeLe && (
                      <button
                        type="button"
                        onClick={() => marquerSigne(s.id)}
                        className="inline-flex items-center gap-1 rounded-full border border-ligne px-2 py-0.5 text-[11px] text-encre-douce hover:border-succes hover:text-succes"
                      >
                        <Check size={11} />
                        Marquer signé
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {erreur?.id === d.id && <p className="mt-1 text-[12px] text-danger">{erreur.message}</p>}
            </div>

            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => telecharger(d.cheminStorage)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-ligne px-3 py-1.5 text-[12.5px] font-medium text-encre transition-colors hover:border-terracotta hover:text-terracotta"
                >
                  <Download size={13} />
                  Document
                </button>
              </div>

              {d.statut === 'en_attente' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => envoyer(d.id)}
                    disabled={enCours === d.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-terracotta px-3 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Send size={13} />
                    {enCours === d.id ? 'Envoi…' : 'Envoyer aux signataires'}
                  </button>
                  <button
                    type="button"
                    onClick={() => annuler(d.id)}
                    aria-label="Annuler"
                    className="text-encre-douce/60 hover:text-danger"
                  >
                    <X size={16} />
                  </button>
                </div>
              )}

              {d.statut === 'en_cours' && (
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-ligne px-3 py-1.5 text-[12px] text-encre-douce hover:border-terracotta">
                  <Upload size={13} />
                  {enCours === d.id ? 'Envoi…' : 'Téléverser le PDF signé'}
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    disabled={enCours === d.id}
                    onChange={(e) => {
                      const fichier = e.target.files?.[0];
                      if (fichier) televerserSigne(d, fichier);
                    }}
                  />
                </label>
              )}

              {d.statut === 'complete' && d.cheminStorageSigne && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => telecharger(d.cheminStorageSigne as string)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-succes/15 px-3 py-1.5 text-[12.5px] font-medium text-succes hover:opacity-80"
                  >
                    <Download size={13} />
                    PDF signé
                  </button>
                  {d.googleDriveFileId ? (
                    <a
                      href={`https://drive.google.com/file/d/${d.googleDriveFileId}/view`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ligne px-3 py-1.5 text-[12.5px] font-medium text-encre hover:border-terracotta hover:text-terracotta"
                    >
                      <ExternalLink size={13} />
                      Voir dans Drive
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => archiver(d.id)}
                      disabled={enCours === d.id}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ligne px-3 py-1.5 text-[12.5px] font-medium text-encre hover:border-terracotta hover:text-terracotta disabled:opacity-40"
                    >
                      <FolderUp size={13} />
                      {enCours === d.id ? 'Envoi…' : 'Archiver dans Drive'}
                    </button>
                  )}
                </div>
              )}

              {d.statut === 'complete' && !d.cheminStorageSigne && (
                <button
                  type="button"
                  onClick={() => recupererEtArchiver(d.id)}
                  disabled={enCours === d.id}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-succes/15 px-3 py-1.5 text-[12.5px] font-medium text-succes hover:opacity-80 disabled:opacity-40"
                >
                  <FileDown size={13} />
                  {enCours === d.id ? 'Récupération…' : 'Récupérer et archiver'}
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
