/** SVG dessinés à la main plutôt que les emoji drapeau (🇫🇷 🇩🇪 🇧🇪 🇱🇺) :
 *  Windows/Chrome desktop ne rend pas ces emoji comme des drapeaux (affiche
 *  "FR", "DE"... en texte faute de police à jour) alors qu'iOS/Android les
 *  affichent nativement — signalé par Jérôme le 26/07/2026 ("sur mobile les
 *  drapeaux apparaissent"). Un SVG garantit le même rendu partout. */
const DRAPEAUX = {
  FR: (
    <svg viewBox="0 0 3 2" className="h-full w-full">
      <rect width="1" height="2" x="0" fill="#0055A4" />
      <rect width="1" height="2" x="1" fill="#fff" />
      <rect width="1" height="2" x="2" fill="#EF4135" />
    </svg>
  ),
  DE: (
    <svg viewBox="0 0 3 2" className="h-full w-full">
      <rect width="3" height="2" fill="#000" />
      <rect width="3" height="1.333" y="0.667" fill="#DD0000" />
      <rect width="3" height="0.667" y="1.333" fill="#FFCE00" />
    </svg>
  ),
  BE: (
    <svg viewBox="0 0 3 2" className="h-full w-full">
      <rect width="1" height="2" x="0" fill="#000" />
      <rect width="1" height="2" x="1" fill="#FAE042" />
      <rect width="1" height="2" x="2" fill="#ED2939" />
    </svg>
  ),
  LU: (
    <svg viewBox="0 0 3 2" className="h-full w-full">
      <rect width="3" height="2" fill="#ED2939" />
      <rect width="3" height="1.333" y="0.667" fill="#fff" />
      <rect width="3" height="0.667" y="1.333" fill="#00A1DE" />
    </svg>
  ),
} as const;

export function FlagIcon({ pays }: { pays: keyof typeof DRAPEAUX }) {
  return (
    <span className="inline-block h-4 w-6 overflow-hidden rounded-[3px] border border-ligne/60 align-middle">
      {DRAPEAUX[pays]}
    </span>
  );
}
