/** Port de MEMBRES_CA (carreau-mondorf-app/Code.gs:1829) — liste fixe, pas
 *  en base : change rarement (élection CA), et ce n'est pas une donnée
 *  RGPD-sensible (déjà publique sur /club). Isolé dans son propre fichier
 *  (pas dans conges.ts) : ce fichier est importé par un composant client
 *  (NouveauCongeForm.tsx), et conges.ts utilise le client serveur
 *  (next/headers) — le mélange casserait le build (piège déjà documenté
 *  dans CLAUDE.md, cf. rencontreDetail.ts pour le même problème résolu). */
export const MEMBRES_CA = [
  { nom: 'Paul VITALI', role: 'Président' },
  { nom: 'John BRAVACCINI', role: 'Vice-Président' },
  { nom: 'Dominique ROUSSET', role: 'Trésorier' },
  { nom: 'Michel PRYBYLA', role: 'Secrétaire' },
  { nom: 'Marie-Jean FLAMMANG', role: 'Membre' },
  { nom: 'Marco BERTEMES', role: 'Membre' },
  { nom: 'Osvaldo BRUNETTA', role: 'Membre' },
] as const;
