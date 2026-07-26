/** Animation de la page /connexion — boules en orbite autour du cochonnet
 *  (le petit but doré, immobile au centre), visuel distinct du flottement
 *  libre de l'accueil (HeroAnimation.tsx) tout en restant dans le même
 *  vocabulaire (boules, couleurs de la charte v2). Server Component, pur
 *  CSS (.orbite/.orbite-boule dans globals.css), respecte
 *  prefers-reduced-motion. */
const ORBITES = [
  { taille: 30, rayon: 70, couleur: 'var(--terracotta)', duree: '9s', sens: 'normal' },
  { taille: 22, rayon: 70, couleur: 'var(--marine)', duree: '9s', sens: 'normal', decalage: 180 },
  { taille: 26, rayon: 110, couleur: 'var(--pin)', duree: '14s', sens: 'reverse' },
  { taille: 18, rayon: 110, couleur: 'var(--laiton)', duree: '14s', sens: 'reverse', decalage: 150 },
  { taille: 34, rayon: 150, couleur: 'var(--terracotta-dark)', duree: '19s', sens: 'normal' },
];

export function HeroAnimationConnexion() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[380px]"
      role="img"
      aria-label="Illustration animée de boules de pétanque en orbite"
    >
      {/* Cochonnet, immobile au centre */}
      <div className="orbe-pulse absolute inset-[46%] rounded-full bg-laiton/25 blur-xl" />
      <div
        className="absolute top-1/2 left-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_2px_6px_rgba(36,27,18,0.5)]"
        style={{ background: 'radial-gradient(circle at 35% 30%, #fff, var(--laiton) 55%)' }}
      />

      {ORBITES.map((o, i) => (
        // Décalage de départ appliqué sur un div statique parent, distinct
        // du div animé (.orbite) : les deux transform ne peuvent pas
        // cohabiter sur le même élément, l'animation écraserait le
        // décalage à chaque frame (keyframe "from { rotate(0deg) }").
        <div key={i} className="absolute inset-0" style={{ transform: o.decalage ? `rotate(${o.decalage}deg)` : undefined }}>
          <div
            className="orbite"
            style={{
              ['--duree' as string]: o.duree,
              ['--sens' as string]: o.sens,
            }}
          >
            <div
              className="orbite-boule rounded-full shadow-[0_6px_16px_-4px_rgba(36,27,18,0.4)]"
              style={{
                width: o.taille,
                height: o.taille,
                background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), ${o.couleur} 42%, ${o.couleur} 100%)`,
                ['--rayon' as string]: `${o.rayon}px`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
