/** Génère la charge utile d'un QR code SEPA EPC (European Payments Council
 *  Quick Response), version 002 — un simple texte multi-lignes que
 *  n'importe quelle appli bancaire mobile sait scanner pour pré-remplir un
 *  virement. Pure fonction : les coordonnées bancaires viennent de
 *  `parametres_club` (migration 0021), plus de valeurs en dur ici — voir
 *  src/lib/paiements.ts. */
export function genererPayloadSepaQr(options: {
  nomBeneficiaire: string;
  iban: string;
  bic?: string | null;
  montant?: number;
  communication: string;
}): string {
  const ibanSansEspaces = options.iban.replace(/\s+/g, '');
  const lignes = [
    'BCD',
    '002',
    '1',
    'SCT',
    options.bic ?? '',
    options.nomBeneficiaire,
    ibanSansEspaces,
    options.montant ? `EUR${options.montant.toFixed(2)}` : '',
    '',
    '',
    options.communication,
  ];
  return lignes.join('\n');
}
