'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { enregistrerClubsEquipes } from '@/lib/actions/tournoi';
import { CLUB_PAR_DEFAUT, cleClub } from '@/lib/tournoi/clubs';
import { BTN, CHAMP, Carte, type Lancer } from './TournoiUi';

export type EquipeAvecClub = {
  id: number;
  numero: number;
  /** Club effectif : saisi, sinon déduit (que des licenciés du club), sinon null. */
  club: string | null;
  /** Ce qui a été tapé à la main, null si rien. */
  clubSaisi: string | null;
};

/**
 * Le club de chaque équipe (équipes fixes), avant le tirage de la première
 * partie : c'est ce qui permet au tirage de ne pas opposer deux équipes d'un
 * même club.
 *
 * L'avertissement « équipes sans club connu » se recalcule à chaque frappe :
 * l'organisateur voit tout de suite ce que le tirage saura, ou ne saura pas,
 * séparer. Les clubs déjà saisis sont proposés en suggestion — « Mondorf » et
 * « Mondorff » seraient deux clubs pour le tirage, une faute de frappe suffit à
 * le mettre en échec.
 */
export function ClubsEquipesFixes({
  tournoiId,
  equipes,
  membresDe,
  enCours,
  lancer,
}: {
  tournoiId: number;
  equipes: EquipeAvecClub[];
  membresDe: (equipeId: number) => string;
  enCours: boolean;
  lancer: Lancer;
}) {
  const [clubs, setClubs] = useState<Record<number, string>>(() =>
    Object.fromEntries(equipes.map((e) => [e.id, e.clubSaisi ?? ''])),
  );
  const modifie = equipes.some((e) => (clubs[e.id] ?? '') !== (e.clubSaisi ?? ''));

  // Le club que le tirage connaîtra une fois enregistré : celui qu'on tape ; à
  // défaut, celui que l'application déduit (équipe de licenciés) — mais on ne
  // sait pas l'inférer pour une équipe dont on vient d'effacer un club saisi.
  const connu = (e: EquipeAvecClub) => {
    const saisi = (clubs[e.id] ?? '').trim();
    if (saisi) return saisi;
    return e.clubSaisi ? null : e.club;
  };
  const sansClub = equipes.filter((e) => cleClub(connu(e)) === null).length;
  const suggestions = [
    ...new Set([CLUB_PAR_DEFAUT, ...equipes.map(connu).filter((c): c is string => cleClub(c) !== null)]),
  ];
  const idListe = `clubs-tournoi-${tournoiId}`;

  return (
    <Carte titre="Club de chaque équipe">
      <p className="mb-3 text-[12.5px] text-encre-douce">
        La première partie évite d&apos;opposer deux équipes du même club — si le tirage ne connaît pas le club, il ne peut pas les
        séparer. Une équipe composée uniquement de licenciés du club est reconnue d&apos;elle-même ; pour toute équipe qui compte un
        invité, tapez le club. À renseigner <b className="text-encre">avant</b> le tirage de la partie 1.
      </p>

      {sansClub > 0 && (
        <p className="mb-3 rounded-xl border border-laiton/40 bg-laiton/10 px-4 py-2.5 text-[12.5px] text-[#7a5c1f]">
          {sansClub === equipes.length
            ? 'Aucun club n’est renseigné : la première partie sera un tirage au sort pur.'
            : `${sansClub} équipe${sansClub > 1 ? 's' : ''} sans club connu sur ${equipes.length} : le tirage ne peut pas ${
                sansClub > 1 ? 'les' : 'la'
              } séparer des autres.`}
        </p>
      )}

      <datalist id={idListe}>
        {suggestions.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
      <ul className="flex flex-col divide-y divide-ligne">
        {equipes.map((e) => (
          <li key={e.id} className="flex flex-wrap items-center gap-3 py-2">
            <span className="font-score w-7 text-[15px] text-terracotta">{e.numero}</span>
            <span className="min-w-0 flex-1 basis-48 break-words text-[13px]">{membresDe(e.id)}</span>
            <input
              value={clubs[e.id] ?? ''}
              onChange={(ev) => setClubs((c) => ({ ...c, [e.id]: ev.target.value }))}
              list={idListe}
              placeholder={e.club && !e.clubSaisi ? `${e.club} (déduit)` : 'Club'}
              maxLength={80}
              className={`${CHAMP} w-60`}
              aria-label={`Club de l'équipe ${e.numero}`}
            />
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={enCours || !modifie}
        onClick={() =>
          lancer(
            () => enregistrerClubsEquipes(tournoiId, equipes.map((e) => ({ equipeId: e.id, club: clubs[e.id] ?? null }))),
            'Clubs enregistrés.',
          )
        }
        className={`${BTN} mt-3 bg-terracotta text-white`}
      >
        <Check size={14} /> {enCours ? 'Enregistrement…' : 'Enregistrer les clubs'}
      </button>
    </Carte>
  );
}
