'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { QrCode, Check, X, Download, Mail } from 'lucide-react';
import { marquerAppelPaye, annulerAppelPaiement, envoyerAppelPaiementEmail } from '@/lib/actions/paiements';
import { genererPayloadSepaQr } from '@/lib/sepaQr';
import { genererCommunicationAppelPaiement } from '@/lib/communicationPaiement';
import type { AppelPaiement, ParametresClub } from '@/lib/paiements';

export function ListeAppelsPaiement({
  appels,
  parametres,
  saisonActive,
}: {
  appels: AppelPaiement[];
  parametres: ParametresClub | null;
  saisonActive: string;
}) {
  const router = useRouter();
  const [qrOuvert, setQrOuvert] = useState<{ appel: AppelPaiement; dataUrl: string } | null>(null);
  const [envoiEnCours, setEnvoiEnCours] = useState<number | null>(null);
  const [erreurEnvoi, setErreurEnvoi] = useState<{ id: number; message: string } | null>(null);

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
    setErreurEnvoi(null);
    const resultat = await marquerAppelPaye(id, 'Virement');
    if (!resultat.ok) {
      setErreurEnvoi({ id, message: resultat.error });
    }
    router.refresh();
  }

  async function annuler(id: number) {
    await annulerAppelPaiement(id);
    router.refresh();
  }

  async function envoyerEmail(id: number) {
    setErreurEnvoi(null);
    setEnvoiEnCours(id);
    const resultat = await envoyerAppelPaiementEmail(id);
    setEnvoiEnCours(null);
    if (!resultat.ok) {
      setErreurEnvoi({ id, message: resultat.error });
      return;
    }
    router.refresh();
  }

  // Retour Jérôme (27/07/2026) : cet écran ne sert qu'à demander un
  // paiement — une fois l'email envoyé, plus rien ne s'y passe pour cet
  // appel (il part sur /outils/paiements-en-attente). Aucun historique
  // ici : "l'historique n'a pas à être là".
  if (appels.length === 0) {
    return (
      <p className="text-[14px] text-encre-douce">
        Aucun appel à cotisation en attente d&apos;envoi. Pour le suivi des relances déjà envoyées, voir{' '}
        <a href="/outils/paiements-en-attente" className="text-terracotta hover:underline">
          Paiements en attente
        </a>
        .
      </p>
    );
  }

  function ligneAppel(a: AppelPaiement, actions: ReactNode) {
    return (
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
          {erreurEnvoi?.id === a.id && <p className="mt-1 text-[12px] text-danger">{erreurEnvoi.message}</p>}
        </div>
        <div className="flex items-center gap-2">{actions}</div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {appels.map((a) =>
          ligneAppel(
            a,
            <>
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
                onClick={() => envoyerEmail(a.id)}
                disabled={!a.personneEmail || envoiEnCours === a.id}
                title={a.personneEmail ? undefined : 'Aucun email associé à cet appel'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-ligne px-3 py-1.5 text-[12.5px] font-medium text-encre transition-colors hover:border-terracotta hover:text-terracotta disabled:opacity-40"
              >
                <Mail size={14} />
                {envoiEnCours === a.id ? 'Envoi…' : "Envoyer l'email"}
              </button>
              <button
                type="button"
                onClick={() => marquerPaye(a.id)}
                aria-label="Marquer payé"
                className="text-succes hover:opacity-70"
              >
                <Check size={18} />
              </button>
              <button
                type="button"
                onClick={() => annuler(a.id)}
                aria-label="Annuler"
                className="text-encre-douce/60 hover:text-danger"
              >
                <X size={18} />
              </button>
            </>
          )
        )}
      </div>

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
