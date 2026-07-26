/** Port de MEMBRES_CA (carreau-mondorf-app/Code.gs:1829) — liste fixe, pas
 *  en base : change rarement (élection CA), et ce n'est pas une donnée
 *  RGPD-sensible (déjà publique sur /club). Isolé dans son propre fichier
 *  (pas dans conges.ts) : ce fichier est importé par un composant client
 *  (NouveauCongeForm.tsx), et conges.ts utilise le client serveur
 *  (next/headers) — le mélange casserait le build (piège déjà documenté
 *  dans CLAUDE.md, cf. rencontreDetail.ts pour le même problème résolu). */
export const MEMBRES_CA = [
  { nom: 'Paul VITALI', role: 'Président', photo: '/comite/paul-vitali.jpg' },
  { nom: 'John BRAVACCINI', role: 'Vice-Président', photo: '/comite/john-bravaccini.jpg' },
  { nom: 'Dominique ROUSSET', role: 'Trésorier', photo: '/comite/dominique-rousset.jpg' },
  { nom: 'Michel PRYBYLA', role: 'Secrétaire', photo: '/comite/michel-prybyla.jpg' },
  { nom: 'Marie-Jean FLAMMANG', role: 'Membre', photo: '/comite/marie-jean-flammang.jpg' },
  { nom: 'Marco BERTEMES', role: 'Membre', photo: '/comite/marco-bertemes.jpg' },
  { nom: 'Osvaldo BRUNETTA', role: 'Membre', photo: '/comite/osvaldo-brunetta.jpg' },
] as const;
