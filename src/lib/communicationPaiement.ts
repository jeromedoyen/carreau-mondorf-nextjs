import type { TypeAppelPaiement } from './paiements';

/** Fonction pure, sans dépendance serveur — importable côté client
 *  (ListeAppelsPaiement.tsx) et côté serveur (actions/paiements.ts) sans
 *  entraîner le reste de lib/paiements.ts (qui lit des cookies) dans le
 *  bundle client. */
const LIBELLE_TYPE: Record<TypeAppelPaiement, string> = {
  'Carte de membre': 'Carte',
  Licence: 'Licence',
  'Carte de membre + Licence': 'Carte+Licence',
  Autre: 'Autre',
};

/** Communication du virement affichée au trésorier et au payeur — retour
 *  Jérôme (27/07/2026) : la référence générée automatiquement (COT-14...)
 *  "n'est pas assez compréhensible pour quelqu'un qui va checker le
 *  paiement". Remplacée par "Cotisation-{année}-{type}-{nom complet}",
 *  ex. "Cotisation-2026-Carte-Jean Testeur". */
export function genererCommunicationAppelPaiement({
  type,
  annee,
  personneNom,
}: {
  type: TypeAppelPaiement;
  annee: string;
  personneNom: string | null;
}): string {
  const segments = ['Cotisation', annee, LIBELLE_TYPE[type]];
  if (personneNom) segments.push(personneNom);
  return segments.join('-');
}
