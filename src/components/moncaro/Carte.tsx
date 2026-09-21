import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Coquille de carte du tableau de bord — reprend à l'identique la carte
 *  déjà employée ailleurs dans l'app (`rounded-2xl`, bordure `ligne`, fond
 *  `sable-carte`, ombre très basse). Factorisée ici parce que le tableau de
 *  bord en aligne une dizaine ; ailleurs dans le projet elle reste écrite
 *  en clair, et il n'y a pas lieu d'y toucher. */
export function Carte({
  titre,
  icone: Icone,
  action,
  enTeteSecondaire,
  children,
  className = '',
}: {
  titre?: string;
  icone?: LucideIcon;
  action?: ReactNode;
  /** Petit texte aligné à droite du titre (période, total, précision). */
  enTeteSecondaire?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)] ${className}`}
    >
      {titre && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {Icone && <Icone size={16} className="shrink-0 text-pin" aria-hidden="true" />}
          <h2 className="font-display text-[15px]">{titre}</h2>
          {enTeteSecondaire && (
            <span className="text-[11.5px] text-encre-douce/70">{enTeteSecondaire}</span>
          )}
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
