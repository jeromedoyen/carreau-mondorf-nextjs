'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { CreditCard, CheckCircle2, XCircle, QrCode, Download } from 'lucide-react';
import { genererPayloadSepaQr } from '@/lib/sepaQr';
import type { MonAdhesion } from '@/lib/moncaro';
import type { ParametresClub } from '@/lib/paiements';

function formatMontant(m: number | null) {
  return m != null ? `${m.toFixed(2)} €` : null;
}

function LigneStatut({ payee, montant, label }: { payee: boolean | null; montant: number | null; label: string }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="flex items-center gap-1.5 text-encre-douce">
        {payee ? <CheckCircle2 size={14} className="text-succes" /> : <XCircle size={14} className="text-danger" />}
        {label}
      </span>
      <span className={payee ? 'text-succes' : 'text-danger'}>
        {payee ? `Payée${formatMontant(montant) ? ' · ' + formatMontant(montant) : ''}` : 'Non payée'}
      </span>
    </div>
  );
}

/** Carte "Ma cotisation" de /moncaro, avec bouton "Payer" qui génère un QR
 *  SEPA à la volée pour le montant restant dû (carte de membre + licence,
 *  demande explicite de Jérôme, 27/07/2026 — "payer ma cotisation 2026
 *  dans sa totalité"). Client Component : la génération du QR (lib
 *  qrcode) ne peut se faire que côté navigateur. */
export function CarteCotisationMoncaro({
  saison,
  monNom,
  adhesion,
  parametres,
}: {
  saison: string;
  monNom: string | null;
  adhesion: MonAdhesion | null;
  parametres: ParametresClub | null;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  if (!adhesion) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)] sm:col-span-2">
        <div className="mb-3 flex items-center gap-2">
          <CreditCard size={16} className="text-pin" />
          <h2 className="font-display text-[15px]">Ma cotisation — saison {saison}</h2>
        </div>
        <p className="text-[13px] text-encre-douce">
          Aucune adhésion enregistrée pour cette saison à ton nom — contacte le comité si tu penses que c&apos;est
          une erreur.
        </p>
      </div>
    );
  }

  const estLicencie = adhesion.type === 'Licencié';
  const resteAPayer =
    (adhesion.cotisationPayee ? 0 : (adhesion.cotisationMontant ?? 0)) +
    (estLicencie && !adhesion.licencePayee ? (adhesion.licenceMontant ?? 0) : 0);
  const toutPaye = (adhesion.cotisationPayee ?? false) && (!estLicencie || (adhesion.licencePayee ?? false));

  async function payer() {
    if (!parametres || !monNom) return;
    const payload = genererPayloadSepaQr({
      nomBeneficiaire: parametres.nomBeneficiaire,
      iban: parametres.iban,
      bic: parametres.bic,
      montant: resteAPayer > 0 ? resteAPayer : undefined,
      communication: `${monNom} - Cotisation Caro ${saison}`,
    });
    const dataUrl = await QRCode.toDataURL(payload, { width: 400, margin: 2 });
    setQrDataUrl(dataUrl);
  }

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)] sm:col-span-2">
      <div className="mb-3 flex items-center gap-2">
        <CreditCard size={16} className="text-pin" />
        <h2 className="font-display text-[15px]">Ma cotisation — saison {saison}</h2>
      </div>

      <p className="mb-3 text-[12.5px] text-encre-douce">
        {estLicencie ? 'Licencié' : 'Membre'}
        {adhesion.categorie ? ` · ${adhesion.categorie}` : ''}
      </p>

      <div className="flex flex-col gap-2">
        <LigneStatut payee={adhesion.cotisationPayee} montant={adhesion.cotisationMontant} label="Carte de membre" />
        {estLicencie && (
          <LigneStatut payee={adhesion.licencePayee} montant={adhesion.licenceMontant} label="Licence" />
        )}
      </div>

      {!toutPaye && (
        <div className="mt-4 border-t border-ligne pt-4">
          {!qrDataUrl ? (
            <button
              type="button"
              onClick={payer}
              disabled={!parametres}
              className="inline-flex items-center gap-2 rounded-lg bg-terracotta px-4 py-2 text-[13px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <QrCode size={15} />
              Payer{resteAPayer > 0 ? ` · ${resteAPayer.toFixed(2)} €` : ''}
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="QR code SEPA de cotisation" width={220} height={220} />
              <p className="text-[12px] text-encre-douce">
                {parametres?.nomBeneficiaire} · {parametres?.iban}
                {resteAPayer > 0 ? ` · ${resteAPayer.toFixed(2)} €` : ''}
              </p>
              <a
                href={qrDataUrl}
                download={`qr-cotisation-${saison}.png`}
                className="inline-flex items-center gap-2 rounded-lg border border-ligne px-4 py-2 text-[13px] text-encre-douce hover:border-terracotta hover:text-terracotta"
              >
                <Download size={14} />
                Télécharger
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
