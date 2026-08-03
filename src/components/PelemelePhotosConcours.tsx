import type { PhotoEquipeConcours } from '@/lib/photosConcours';

function formatDate(iso: string) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** Petite variation déterministe (même photo = même inclinaison à chaque
 *  rendu, pas de sautillement au rechargement) — donne l'air d'un vrai
 *  pêle-mêle punaisé plutôt qu'une grille bien rangée. */
function inclinaison(cle: string): number {
  let h = 0;
  for (let i = 0; i < cle.length; i++) h = (h * 31 + cle.charCodeAt(i)) % 997;
  return (h % 9) - 4; // -4° à +4°
}

/** Pêle-mêle des photos d'équipe reçues avec les déclarations vocales
 *  (idée Jérôme, 03/08/2026) — jusque-là stockées mais jamais montrées
 *  nulle part. Réservé à la trésorerie (page appelante), au même titre
 *  que le reste du module remboursements. */
export function PelemelePhotosConcours({ photos }: { photos: PhotoEquipeConcours[] }) {
  if (!photos.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ligne bg-sable-carte p-10 text-center">
        <p className="font-display text-lg italic text-encre-douce">Rien d&apos;épinglé pour l&apos;instant</p>
        <p className="mt-1.5 text-[13px] text-encre-douce">
          Les selfies d&apos;équipe des déclarations vocales apparaîtront ici au fil des concours.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-ligne p-6 sm:p-10"
      style={{
        backgroundColor: 'var(--sable)',
        backgroundImage:
          'radial-gradient(color-mix(in srgb, var(--encre) 8%, transparent) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4">
        {photos.map((photo, i) => (
          <a
            key={photo.chemin}
            href={photo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block transition-transform duration-200 hover:z-10 hover:!rotate-0 hover:scale-105"
            style={{ transform: `rotate(${inclinaison(photo.chemin)}deg)` }}
          >
            {/* Punaise — alterne terracotta/pin comme le reste de la charte
                (clin d'œil : "pin" est aussi le nom de la teinte verte). */}
            <span
              className="absolute -top-2.5 left-1/2 z-10 h-4 w-4 -translate-x-1/2 rounded-full shadow-md ring-2 ring-black/10"
              style={{ backgroundColor: i % 3 === 0 ? 'var(--pin)' : 'var(--terracotta)' }}
            />
            <div className="bg-sable-carte p-2.5 pb-4 shadow-[0_6px_16px_rgba(36,27,18,0.18)]">
              <img
                src={photo.url}
                alt={`Équipe au concours de ${photo.club ?? 'concours'}, ${formatDate(photo.date)}`}
                loading="lazy"
                className="aspect-square w-full bg-sable object-cover"
              />
              <div className="mt-2.5 text-center">
                <p className="font-display text-[15px] italic leading-tight text-encre">
                  {photo.club ?? 'Concours'}
                </p>
                <p className="font-score text-[11px] tracking-[0.15em] text-terracotta">
                  {formatDate(photo.date).toUpperCase()}
                </p>
                {photo.joueurs.length > 0 && (
                  <p className="mt-0.5 truncate text-[10.5px] text-encre-douce" title={photo.joueurs.join(', ')}>
                    {photo.joueurs.join(' · ')}
                  </p>
                )}
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
