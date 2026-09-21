import { Award } from 'lucide-react';
import type { MonAdhesion } from '@/lib/moncaro';
import type { Distinction } from '@/lib/tableauDeBord';

/** Initiales pour le monogramme. `personnes` ne porte pas de photo — pas de
 *  colonne, pas de bucket — donc plutôt qu'un avatar générique gris, on
 *  affiche les initiales du membre dans la palette du club. */
function initiales(nom: string): string {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((mot) => mot[0]?.toUpperCase() ?? '')
    .join('');
}

export function EnTeteLicencie({
  nom,
  saison,
  adhesion,
  resume,
  distinctions,
}: {
  nom: string | null;
  saison: string;
  adhesion: MonAdhesion | null;
  /** Phrase construite à partir des chiffres réels, `null` s'il n'y a rien
   *  à dire — on ne félicite jamais dans le vide. */
  resume: string | null;
  distinctions: Distinction[];
}) {
  const prenom = nom?.split(' ')[0] ?? null;

  const meta = [
    adhesion?.numeroLicence ? `Licence n° ${adhesion.numeroLicence}` : null,
    adhesion?.categorie,
    adhesion?.type,
  ].filter((x): x is string => !!x);

  return (
    <header className="entree rounded-2xl border border-ligne bg-sable-carte p-5 shadow-[0_1px_3px_rgba(36,27,18,.04)] sm:p-6">
      <div className="flex items-start gap-4">
        {nom && (
          <span
            className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-terracotta/10 text-[19px] italic text-terracotta sm:h-16 sm:w-16 sm:text-[22px]"
            aria-hidden="true"
          >
            {initiales(nom)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-score text-[12.5px] tracking-[0.2em] text-terracotta">SAISON {saison}</p>
          <h1 className="font-display mt-0.5 text-[26px] leading-tight italic sm:text-[32px]">
            {prenom ? `Bonjour, ${prenom}` : 'Bienvenue'}
          </h1>
          {meta.length > 0 && (
            <p className="mt-1.5 text-[12.5px] text-encre-douce">{meta.join(' · ')}</p>
          )}
        </div>
      </div>

      {resume && (
        <p className="mt-4 border-t border-ligne pt-4 text-[14px] leading-relaxed text-encre">
          {resume}
        </p>
      )}

      {distinctions.length > 0 && (
        <ul className="mt-3.5 flex flex-wrap gap-2">
          {distinctions.map((d) => (
            <li
              key={d.libelle}
              className="flex items-center gap-1.5 rounded-full bg-laiton/12 px-3 py-1.5 text-[12px] text-encre"
            >
              <Award size={13} className="shrink-0 text-laiton" aria-hidden="true" />
              <span className="font-medium">{d.libelle}</span>
              <span className="text-encre-douce">— {d.detail}</span>
            </li>
          ))}
        </ul>
      )}
    </header>
  );
}
