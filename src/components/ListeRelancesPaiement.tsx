'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { QrCode, Check, X, Download } from 'lucide-react';
import { marquerAppelPaye, annulerAppelPaiement } from '@/lib/actions/paiements';
import { genererPayloadSepaQr } from '@/lib/sepaQr';
import { genererCommunicationAppelPaiement } from '@/lib/communicationPaiement';
import type { AppelPaiement, ParametresClub } from '@/lib/paiements';

const STATUT_COULEUR: Record<string, string> = {
  payee: 'bg-succes/15 text-succes',
  annulee: 'bg-encre-douce/15 text-encre-douce',
};
const STATUT_LABEL: Record<string, string> = {
  payee: 'Payée',
  annulee: 'Annulée',
};

/** Écran dédié au contrôle financier (retour Jérôme, 27/07/2026) : une
 *  fois l'email de relance envoyé, l'appel quitte /outils/paiements et
 *  atterrit ici — un envoi groupé peut en laisser 10 à 30 en attente, le
 *  trésorier les parcourt un par un en pointant ses relevés de compte et
 *  valide. Même actions que la liste principale (QR, marquer payé,
 *  annuler), sans "Envoyer l'email" (déjà fait) ni "Nouvel appel".
 *  L'historique (payés/annulés) vit tout en bas de ce même écran — "c'est
 *  là qu'il y a peut-être un intérêt à en avoir un", pas sur l'écran de
 *  création qui n'a plus besoin d'en garder trace. */
export function ListeRelancesPaiement({
  appels,
  historique,
  parametres,
  saisonActive,
}: {
  appels: AppelPaiement[];
  historique: AppelPaiement[];
  parametres: ParametresClub | null;
  saisonActive: string;
}) {
  const router = useRouter();
  const [qrOuvert, setQrOuvert] = useState<{ appel: AppelPaiement; dataUrl: string } | null>(null);
  const [erreur, setErreur] = useState<{ id: number; message: string } | null>(null);
  // Retour Jérôme (01/08/2026, via /pb) : l'icône de validation était trop
  // petite et sans retour visuel pendant la requête — le trésorier ne
  // savait pas si son clic avait été pris en compte.
  const [validationEnCours, setValidationEnCours] = useState<number | null>(null);

  async function genererQr(appel: AppelPaiement) {
    if (!parametres) return;
    const payload = genererPayloadSepaQr({
      nomBeneficiaire: parametres.nomBeneficiaire,
      iban: parametres.iban,
      bic: parametres.bic,
      montant: appel.montant,
      communication: genererCommunicationAppelPaiement({
        type: appel.type,
        annee: saisonActive,
        personneNom: appel.personneNom,
      }),
    });
    const dataUrl = await QRCode.toDataURL(payload, { width: 480, margin: 2 });
    setQrOuvert({ appel, dataUrl });
  }

  async function marquerPaye(id: number) {
    setErreur(null);
    setValidationEnCours(id);
    const resultat = await marquerAppelPaye(id, 'Virement');
    setValidationEnCours(null);
    if (!resultat.ok) {
      setErreur({ id, message: resultat.error });
    }
    router.refresh();
  }

  async function annuler(id: number) {
    await annulerAppelPaiement(id);
    router.refresh();
  }

  return (
    <>
      {appels.length === 0 ? (
        <p className="text-[14px] text-encre-douce">Aucun paiement en attente pour l&apos;instant.</p>
      ) : (
      <div className="flex flex-col gap-2.5">
        {appels.map((a) => (
          <div
            key={a.id}
            className="flex flex-col gap-2 rounded-2xl border border-ligne bg-sable-carte p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
          >
            <div>
              <span className="font-display text-[14.5px]">{a.description}</span>
              <p className="mt-0.5 text-[12px] text-encre-douce">
                {a.type} · {a.montant.toFixed(2)} € · {a.reference}
                {a.personneNom ? ` · ${a.personneNom}` : ''}
              </p>
              {a.emailEnvoyeLe && (
                <p className="mt-0.5 text-[11.5px] text-encre-douce/70">
                  Relance envoyée le {new Date(a.emailEnvoyeLe).toLocaleDateString('fr-FR')}
                </p>
              )}
              {erreur?.id === a.id && <p className="mt-1 text-[12px] text-danger">{erreur.message}</p>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => genererQr(a)}
                disabled={!parametres}
                className="inline-flex items-center gap-1.5 rounded-lg bg-pin px-3 py-1.5 text-[12.5px] font-medium text-sable-carte transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                <QrCode size={14} />
                QR
              </button>
              <button
                type="button"
                onClick={() => marquerPaye(a.id)}
                disabled={validationEnCours === a.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-succes px-3 py-1.5 text-[12.5px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                <Check size={14} />
                {validationEnCours === a.id ? 'Validation…' : 'Payé'}
              </button>
              <button
                type="button"
                onClick={() => annuler(a.id)}
                aria-label="Annuler"
                className="text-encre-douce/60 hover:text-danger"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      )}

      {historique.length > 0 && (
        <div className="mt-8 flex flex-col gap-2.5">
          <h3 className="font-display text-[14px]">Historique</h3>
          {historique.map((a) => (
            <div
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ligne bg-sable-carte p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-[14.5px]">{a.description}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUT_COULEUR[a.statut]}`}>
                    {STATUT_LABEL[a.statut]}
                  </span>
                </div>
                <p className="mt-0.5 text-[12px] text-encre-douce">
                  {a.type} · {a.montant.toFixed(2)} € · {a.reference}
                  {a.personneNom ? ` · ${a.personneNom}` : ''}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {qrOuvert && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-encre/40 px-5"
          onClick={() => setQrOuvert(null)}
        >
          <div
            className="flex flex-col items-center gap-4 rounded-2xl border border-ligne bg-sable-carte p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrOuvert.dataUrl} alt="QR code SEPA" width={260} height={260} />
            <div className="text-[12.5px] text-encre-douce">
              <p className="font-medium">{qrOuvert.appel.description}</p>
              <p>{qrOuvert.appel.montant.toFixed(2)} € · {qrOuvert.appel.reference}</p>
            </div>
            <div className="flex gap-2">
              <a
                href={qrOuvert.dataUrl}
                download={`qr-${qrOuvert.appel.reference}.png`}
                className="inline-flex items-center gap-2 rounded-lg bg-pin px-4 py-2 text-[13px] font-medium text-sable-carte transition-opacity hover:opacity-90"
              >
                <Download size={14} />
                Télécharger
              </a>
              <button
                type="button"
                onClick={() => setQrOuvert(null)}
                className="rounded-lg border border-ligne px-4 py-2 text-[13px] text-encre-douce hover:border-terracotta hover:text-terracotta"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
