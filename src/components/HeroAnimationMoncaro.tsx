/** Animation de /moncaro — troisième variante après le flottement libre de
 *  l'accueil (HeroAnimation.tsx) et l'orbite de la connexion
 *  (HeroAnimationConnexion.tsx) : les boules montent et descendent, une
 *  reste immobile au sol (le cochonnet, repère fixe) — demande explicite
 *  de Jérôme, 27/07/2026. Server Component, pur CSS (.boule-bondissante). */
const BOULES = [
  { taille: 46, left: '10%', couleur: 'var(--terracotta)', duree: '3.2s', delai: '0s', amplitude: -26 },
  { taille: 34, left: '26%', couleur: 'var(--marine)', duree: '3.8s', delai: '0.5s', amplitude: -18 },
  { taille: 40, left: '58%', couleur: 'var(--pin)', duree: '2.9s', delai: '0.2s', amplitude: -30 },
  { taille: 30, left: '74%', couleur: 'var(--terracotta-dark)', duree: '3.5s', delai: '0.9s', amplitude: -16 },
  { taille: 38, left: '90%', couleur: 'var(--pin-clair)', duree: '4.1s', delai: '0.35s', amplitude: -22 },
];

export function HeroAnimationMoncaro() {
  return (
    <div
      className="relative mx-auto h-[140px] w-full max-w-[420px]"
      role="img"
      aria-label="Illustration animée de boules de pétanque qui rebondissent"
    >
      <div className="absolute inset-x-0 bottom-0 h-px bg-ligne" />

      {/* Cochonnet, immobile — repère fixe au sol pendant que les boules rebondissent */}
      <div
        className="absolute bottom-0 h-3 w-3 -translate-x-1/2 rounded-full shadow-[0_2px_6px_rgba(36,27,18,0.5)]"
        style={{ left: '42%', background: 'radial-gradient(circle at 35% 30%, #fff, var(--laiton) 55%)' }}
      />

      {BOULES.map((b, i) => (
        // Décalage horizontal (translateX) posé sur un parent statique,
        // distinct de l'enfant animé (.boule-bondissante) : les deux
        // transform ne peuvent pas cohabiter sur le même élément, sinon
        // l'animation verticale écraserait le centrage à chaque frame
        // (même piège déjà rencontré dans HeroAnimationConnexion.tsx).
        <div key={i} className="absolute bottom-0" style={{ left: b.left, transform: 'translateX(-50%)' }}>
          <div
            className="boule-bondissante rounded-full shadow-[0_8px_16px_-6px_rgba(36,27,18,0.4)]"
            style={{
              width: b.taille,
              height: b.taille,
              background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), ${b.couleur} 42%, ${b.couleur} 100%)`,
              ['--duree' as string]: b.duree,
              ['--delai' as string]: b.delai,
              ['--amplitude' as string]: `${b.amplitude}px`,
            }}
          />
        </div>
      ))}
    </div>
  );
}
