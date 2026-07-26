/** Animation visuelle de l'accueil (boules de pétanque flottantes, pur CSS
 *  via .boule-flottante/.orbe-pulse dans globals.css). Server Component —
 *  aucune interactivité, pas besoin d'hydrater côté client. Couleurs
 *  strictement issues de la charte v2 (terracotta/pin/laiton/marine), pas
 *  de palette générique hors-charte. */
const BOULES = [
  { taille: 64, top: '8%', left: '18%', couleur: 'var(--terracotta)', duree: '5.5s', delai: '0s' },
  { taille: 44, top: '55%', left: '8%', couleur: 'var(--pin)', duree: '4.5s', delai: '0.4s' },
  { taille: 52, top: '18%', left: '62%', couleur: 'var(--marine)', duree: '6s', delai: '0.8s' },
  { taille: 36, top: '68%', left: '70%', couleur: 'var(--laiton)', duree: '4s', delai: '1.2s' },
  { taille: 58, top: '40%', left: '42%', couleur: 'var(--pin-clair)', duree: '5s', delai: '0.2s' },
  { taille: 30, top: '78%', left: '32%', couleur: 'var(--terracotta-dark)', duree: '4.8s', delai: '1.6s' },
];

export function HeroAnimation() {
  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[380px] sm:mx-0"
      role="img"
      aria-label="Illustration animée de boules de pétanque"
    >
      <div className="orbe-pulse absolute inset-[12%] rounded-full bg-terracotta/15 blur-3xl" />
      <div className="orbe-pulse absolute inset-[22%] rounded-full bg-pin/15 blur-2xl" style={{ animationDelay: '1s' }} />
      {BOULES.map((b, i) => (
        <div
          key={i}
          className="boule-flottante absolute rounded-full shadow-[0_8px_20px_-6px_rgba(36,27,18,0.4)]"
          style={{
            width: b.taille,
            height: b.taille,
            top: b.top,
            left: b.left,
            background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.85), ${b.couleur} 42%, ${b.couleur} 100%)`,
            ['--duree' as string]: b.duree,
            ['--delai' as string]: b.delai,
          }}
        />
      ))}
    </div>
  );
}
