'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import Link from 'next/link';
import { CreditCard, CheckCircle2, XCircle, QrCode, Download, RefreshCw } from 'lucide-react';
import { genererPayloadSepaQr } from '@/lib/sepaQr';
import type { MonAdhesion } from '@/lib/moncaro';
import type { ParametresClub } from '@/lib/paiements';

function formatMontant(m: number | null) {
  return m != null ? `${m.toFixed(2)} €` : null;
}

/** Pense-bête 27/07/2026 : "si c'est payé alors c'est vert, on ne parle
 *  plus de prix" — puce compacte (icône + libellé colorés), plus de
 *  "Payée · 20.00 €" / "Non payée" à côté. Le statut se lit uniquement à
 *  la couleur/coche, pour ne pas surcharger la carte. */
function PuceStatut({ payee, label }: { payee: boolean | null; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium ${
        payee ? 'bg-succes/15 text-succes' : 'bg-danger/10 text-danger'
      }`}
    >
      {payee ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
      {label}
    </span>
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
        <p className="mb-3 text-[13px] text-encre-douce">
          Aucune adhésion enregistrée pour cette saison à ton nom.
        </p>
        <Link
          href="/moncaro/renouveler"
          className="inline-flex items-center gap-1.5 text-[12.5px] text-terracotta hover:underline"
        >
          <RefreshCw size={13} />
          Renouveler mon adhésion
        </Link>
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
      <div className="mb-2 flex items-center gap-2">
        <CreditCard size={15} className="text-pin" />
        <h2 className="font-display text-[14px]">Ma cotisation — saison {saison}</h2>
      </div>

      <p className="mb-2.5 text-[12px] text-encre-douce">
        {estLicencie ? 'Licencié' : 'Membre'}
        {adhesion.categorie ? ` · ${adhesion.categorie}` : ''}
      </p>

      <div className="flex flex-wrap gap-2">
        <PuceStatut payee={adhesion.cotisationPayee} label="Carte de membre" />
        {estLicencie && <PuceStatut payee={adhesion.licencePayee} label="Licence" />}
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
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-2 text-[13px]">
                <div>
                  <p className="text-[10.5px] uppercase tracking-wide text-encre-douce/60">Montant</p>
                  <p className="font-score text-xl text-terracotta">
                    {resteAPayer > 0 ? `${resteAPayer.toFixed(2)} €` : 'À renseigner'}
                  </p>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wide text-encre-douce/60">Communication</p>
                  <p className="text-encre">{monNom} - Cotisation Caro {saison}</p>
                </div>
                <div>
                  <p className="text-[10.5px] uppercase tracking-wide text-encre-douce/60">IBAN</p>
                  <p className="text-encre">{parametres?.iban}</p>
                </div>
                {parametres?.bic && (
                  <div>
                    <p className="text-[10.5px] uppercase tracking-wide text-encre-douce/60">BIC</p>
                    <p className="text-encre">{parametres.bic}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center gap-2 text-center sm:shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrDataUrl} alt="QR code SEPA de cotisation" width={180} height={180} />
                <p className="text-[12px] font-medium text-encre">{parametres?.nomBeneficiaire}</p>
                <a
                  href={qrDataUrl}
                  download={`qr-cotisation-${saison}.png`}
                  className="inline-flex items-center gap-1.5 text-[12px] text-terracotta hover:underline"
                >
                  <Download size={13} />
                  Télécharger
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
