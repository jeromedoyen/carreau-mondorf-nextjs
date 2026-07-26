/** Génère la charge utile d'un QR code SEPA EPC (European Payments Council
 *  Quick Response), version 002, la même que pense-bête #8 décrivait — un
 *  simple texte multi-lignes que n'importe quelle appli bancaire mobile
 *  sait scanner pour pré-remplir un virement. Coordonnées du club en dur
 *  ici plutôt que passées en props : un seul bénéficiaire possible dans ce
 *  club, pas la peine d'en faire un paramètre générique. */
export const COMPTE_CLUB = {
  nomBeneficiaire: 'Carreau Mondorf ASBL',
  iban: 'LU12 3456 7890 1234 5678',
  bic: 'BCLXLULL',
};

export function genererPayloadSepaQr(options: { montant?: number; communication: string }): string {
  const ibanSansEspaces = COMPTE_CLUB.iban.replace(/\s+/g, '');
  const lignes = [
    'BCD',
    '002',
    '1',
    'SCT',
    COMPTE_CLUB.bic,
    COMPTE_CLUB.nomBeneficiaire,
    ibanSansEspaces,
    options.montant ? `EUR${options.montant.toFixed(2)}` : '',
    '',
    '',
    options.communication,
  ];
  return lignes.join('\n');
}
