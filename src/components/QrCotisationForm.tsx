'use client';

import { useState, type FormEvent } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';
import { genererPayloadSepaQr, COMPTE_CLUB } from '@/lib/sepaQr';

export function QrCotisationForm() {
  const [communication, setCommunication] = useState('Cotisation 2026');
  const [montant, setMontant] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function generer(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    if (!communication.trim()) {
      setErreur('La communication est obligatoire.');
      return;
    }
    const payload = genererPayloadSepaQr({
      montant: montant ? Number(montant) : undefined,
      communication: communication.trim(),
    });
    try {
      const dataUrl = await QRCode.toDataURL(payload, { width: 480, margin: 2 });
      setQrDataUrl(dataUrl);
    } catch {
      setErreur('Impossible de générer le QR code.');
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={generer} className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5">
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-encre-douce">Communication *</label>
          <input
            value={communication}
            onChange={(e) => setCommunication(e.target.value)}
            required
            placeholder="Cotisation 2026 - Jean Dupont"
            className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <div>
          <label className="mb-1 block text-[12.5px] font-medium text-encre-douce">Montant (EUR, optionnel)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            placeholder="20.00"
            className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>

        {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}

        <button
          type="submit"
          className="self-start rounded-lg bg-terracotta px-4 py-2 text-[13.5px] font-medium text-white transition-opacity hover:opacity-90"
        >
          Générer le QR code
        </button>
      </form>

      {qrDataUrl && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-ligne bg-sable-carte p-6 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt="QR code SEPA de cotisation" width={240} height={240} />
          <div className="text-[12.5px] text-encre-douce">
            <p className="font-medium">{COMPTE_CLUB.nomBeneficiaire}</p>
            <p>{COMPTE_CLUB.iban}</p>
            <p>{COMPTE_CLUB.bic}</p>
          </div>
          <a
            href={qrDataUrl}
            download={`qr-cotisation-${communication.trim().replace(/\s+/g, '-').toLowerCase()}.png`}
            className="inline-flex items-center gap-2 rounded-lg bg-pin px-4 py-2 text-[13.5px] font-medium text-sable-carte transition-opacity hover:opacity-90"
          >
            <Download size={15} />
            Télécharger le PNG
          </a>
        </div>
      )}
    </div>
  );
}
