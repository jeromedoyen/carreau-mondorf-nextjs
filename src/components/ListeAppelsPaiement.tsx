'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'qrcode';
import { QrCode, Check, X, Download } from 'lucide-react';
import { marquerAppelPaye, annulerAppelPaiement } from '@/lib/actions/paiements';
import { genererPayloadSepaQr } from '@/lib/sepaQr';
import type { AppelPaiement, ParametresClub } from '@/lib/paiements';

const STATUT_COULEUR: Record<string, string> = {
  en_attente: 'bg-terracotta/10 text-terracotta',
  payee: 'bg-succes/15 text-succes',
  annulee: 'bg-encre-douce/15 text-encre-douce',
};
const STATUT_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  payee: 'Payée',
  annulee: 'Annulée',
};

export function ListeAppelsPaiement({
  appels,
  parametres,
}: {
  appels: AppelPaiement[];
  parametres: ParametresClub | null;
}) {
  const router = useRouter();
  const [qrOuvert, setQrOuvert] = useState<{ appel: AppelPaiement; dataUrl: string } | null>(null);

  async function genererQr(appel: AppelPaiement) {
    if (!parametres) return;
    const payload = genererPayloadSepaQr({
      nomBeneficiaire: parametres.nomBeneficiaire,
      iban: parametres.iban,
      bic: parametres.bic,
      montant: appel.montant,
      communication: `${appel.description} (${appel.reference})`,
    });
    const dataUrl = await QRCode.toDataURL(payload, { width: 480, margin: 2 });
    setQrOuvert({ appel, dataUrl });
  }

  async function marquerPaye(id: number) {
    await marquerAppelPaye(id, 'Virement');
    router.refresh();
  }

  async function annuler(id: number) {
    await annulerAppelPaiement(id);
    router.refresh();
  }

  if (appels.length === 0) {
    return <p className="text-[14px] text-encre-douce">Aucun appel de paiement pour l&apos;instant.</p>;
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        {appels.map((a) => (
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
            <div className="flex items-center gap-2">
              {a.statut === 'en_attente' && (
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
              )}
            </div>
          </div>
        ))}
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
