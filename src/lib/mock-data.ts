import type { ClassementDivisionD2, EvolutionPoint } from './types';

/**
 * Données de développement — recalculées à la main depuis les vrais résultats
 * déjà saisis dans l'app Apps Script (saison 2026, journées 1 à 8), pas des
 * chiffres inventés. Utile pour construire/tester les pages avant que
 * l'import Supabase réel ne soit branché (voir scripts/import-csv.ts).
 */

type ClubJournee = {
  club: string;
  parJournee: Array<{ victoires: number; defaites: number; ptsFaits: number; ptsRendus: number }>;
};

const DONNEES: ClubJournee[] = [
  {
    club: 'Carreau Mondorf',
    parJournee: [
      { victoires: 1, defaites: 0, ptsFaits: 36, ptsRendus: 27 },
      { victoires: 1, defaites: 0, ptsFaits: 36, ptsRendus: 27 },
      { victoires: 2, defaites: 0, ptsFaits: 80, ptsRendus: 46 },
      { victoires: 3, defaites: 0, ptsFaits: 131, ptsRendus: 58 },
      { victoires: 4, defaites: 0, ptsFaits: 171, ptsRendus: 81 },
      { victoires: 4, defaites: 1, ptsFaits: 202, ptsRendus: 113 },
      { victoires: 5, defaites: 1, ptsFaits: 237, ptsRendus: 141 },
      { victoires: 6, defaites: 1, ptsFaits: 278, ptsRendus: 163 },
    ],
  },
  {
    club: 'KaBoule',
    parJournee: [
      { victoires: 1, defaites: 0, ptsFaits: 52, ptsRendus: 11 },
      { victoires: 1, defaites: 1, ptsFaits: 80, ptsRendus: 46 },
      { victoires: 2, defaites: 1, ptsFaits: 112, ptsRendus: 77 },
      { victoires: 3, defaites: 1, ptsFaits: 144, ptsRendus: 108 },
      { victoires: 4, defaites: 1, ptsFaits: 178, ptsRendus: 137 },
      { victoires: 4, defaites: 1, ptsFaits: 178, ptsRendus: 137 },
      { victoires: 4, defaites: 2, ptsFaits: 206, ptsRendus: 172 },
      { victoires: 5, defaites: 2, ptsFaits: 249, ptsRendus: 192 },
    ],
  },
  {
    club: 'Schierener Bullemettïen',
    parJournee: [
      { victoires: 1, defaites: 0, ptsFaits: 44, ptsRendus: 19 },
      { victoires: 2, defaites: 0, ptsFaits: 79, ptsRendus: 47 },
      { victoires: 3, defaites: 0, ptsFaits: 117, ptsRendus: 72 },
      { victoires: 3, defaites: 0, ptsFaits: 117, ptsRendus: 72 },
      { victoires: 3, defaites: 1, ptsFaits: 140, ptsRendus: 112 },
      { victoires: 4, defaites: 1, ptsFaits: 185, ptsRendus: 130 },
      { victoires: 4, defaites: 2, ptsFaits: 204, ptsRendus: 174 },
      { victoires: 4, defaites: 3, ptsFaits: 233, ptsRendus: 208 },
    ],
  },
  {
    club: 'A Rifat Steinfort',
    parJournee: [
      { victoires: 0, defaites: 1, ptsFaits: 19, ptsRendus: 44 },
      { victoires: 0, defaites: 2, ptsFaits: 42, ptsRendus: 84 },
      { victoires: 0, defaites: 3, ptsFaits: 73, ptsRendus: 116 },
      { victoires: 1, defaites: 3, ptsFaits: 107, ptsRendus: 145 },
      { victoires: 1, defaites: 3, ptsFaits: 107, ptsRendus: 145 },
      { victoires: 2, defaites: 3, ptsFaits: 139, ptsRendus: 176 },
      { victoires: 3, defaites: 3, ptsFaits: 179, ptsRendus: 199 },
      { victoires: 4, defaites: 3, ptsFaits: 213, ptsRendus: 228 },
    ],
  },
  {
    club: 'Club Bouliste Lasauvage',
    parJournee: [
      { victoires: 0, defaites: 0, ptsFaits: 0, ptsRendus: 0 },
      { victoires: 1, defaites: 0, ptsFaits: 40, ptsRendus: 23 },
      { victoires: 1, defaites: 1, ptsFaits: 59, ptsRendus: 67 },
      { victoires: 1, defaites: 2, ptsFaits: 90, ptsRendus: 99 },
      { victoires: 1, defaites: 3, ptsFaits: 111, ptsRendus: 141 },
      { victoires: 1, defaites: 4, ptsFaits: 142, ptsRendus: 173 },
      { victoires: 2, defaites: 4, ptsFaits: 186, ptsRendus: 192 },
      { victoires: 2, defaites: 4, ptsFaits: 186, ptsRendus: 192 },
    ],
  },
  {
    club: 'CBC Belvaux-Metzerlach',
    parJournee: [
      { victoires: 0, defaites: 1, ptsFaits: 11, ptsRendus: 52 },
      { victoires: 1, defaites: 1, ptsFaits: 45, ptsRendus: 81 },
      { victoires: 1, defaites: 1, ptsFaits: 45, ptsRendus: 81 },
      { victoires: 1, defaites: 2, ptsFaits: 57, ptsRendus: 132 },
      { victoires: 2, defaites: 2, ptsFaits: 99, ptsRendus: 153 },
      { victoires: 2, defaites: 3, ptsFaits: 117, ptsRendus: 198 },
      { victoires: 2, defaites: 4, ptsFaits: 140, ptsRendus: 238 },
      { victoires: 2, defaites: 5, ptsFaits: 160, ptsRendus: 281 },
    ],
  },
  {
    club: 'Stenemer Bulls Steinheim',
    parJournee: [
      { victoires: 0, defaites: 1, ptsFaits: 27, ptsRendus: 36 },
      { victoires: 0, defaites: 2, ptsFaits: 56, ptsRendus: 70 },
      { victoires: 0, defaites: 3, ptsFaits: 81, ptsRendus: 108 },
      { victoires: 0, defaites: 4, ptsFaits: 110, ptsRendus: 142 },
      { victoires: 0, defaites: 5, ptsFaits: 139, ptsRendus: 176 },
      { victoires: 1, defaites: 5, ptsFaits: 171, ptsRendus: 207 },
      { victoires: 1, defaites: 5, ptsFaits: 171, ptsRendus: 207 },
      { victoires: 1, defaites: 6, ptsFaits: 193, ptsRendus: 248 },
    ],
  },
];

const JOURNEES = [1, 2, 3, 4, 5, 6, 7, 8];

function construireClassement(): ClassementDivisionD2 {
  const clubs = DONNEES.map((d) => d.club);
  const evolution: Record<string, EvolutionPoint[]> = {};
  DONNEES.forEach((d) => {
    evolution[d.club] = [];
  });

  JOURNEES.forEach((journee, i) => {
    const snapshot = DONNEES.map((d) => {
      const s = d.parJournee[i];
      return { club: d.club, ...s, diff: s.ptsFaits - s.ptsRendus };
    }).sort((a, b) => b.victoires - a.victoires || b.diff - a.diff || b.ptsFaits - a.ptsFaits);

    snapshot.forEach((entree, index) => {
      evolution[entree.club].push({
        journee,
        rang: index + 1,
        joues: entree.victoires + entree.defaites,
        victoires: entree.victoires,
        defaites: entree.defaites,
        ptsFaits: entree.ptsFaits,
        ptsRendus: entree.ptsRendus,
        diff: entree.diff,
      });
    });
  });

  const classementFinal = DONNEES.map((d) => {
    const s = d.parJournee[d.parJournee.length - 1];
    return { club: d.club, ...s, diff: s.ptsFaits - s.ptsRendus, joues: s.victoires + s.defaites };
  })
    .sort((a, b) => b.victoires - a.victoires || b.diff - a.diff || b.ptsFaits - a.ptsFaits)
    .map((e, i) => ({ ...e, rang: i + 1 }));

  return { saison: '2026', journees: JOURNEES, clubs, evolution, classementFinal };
}

export const mockClassementD2 = construireClassement();

/** Calendrier des rencontres de Carreau Mondorf, mêmes résultats réels que
 *  ci-dessus (source : ChampionnatBackend.gs, saison 2026). J2 et J9 exemptes. */
export const mockRencontresD2 = [
  { journee: 1, date: '2026-04-11', domicile: false, adversaire: 'Stenemer Bulls Steinheim', scoreCM: 36, scoreAdverse: 27, statut: 'Jouée' as const },
  { journee: 2, date: '2026-04-18', domicile: null, adversaire: null, scoreCM: null, scoreAdverse: null, statut: 'Exempt' as const },
  { journee: 3, date: '2026-04-25', domicile: false, adversaire: 'Club Bouliste Lasauvage', scoreCM: 44, scoreAdverse: 19, statut: 'Jouée' as const },
  { journee: 4, date: '2026-05-02', domicile: true, adversaire: 'CBC Belvaux-Metzerlach', scoreCM: 51, scoreAdverse: 12, statut: 'Jouée' as const },
  { journee: 5, date: '2026-05-09', domicile: false, adversaire: 'Schierener Bullemettïen', scoreCM: 40, scoreAdverse: 23, statut: 'Jouée' as const },
  { journee: 6, date: '2026-05-16', domicile: true, adversaire: 'A Rifat Steinfort', scoreCM: 31, scoreAdverse: 32, statut: 'Jouée' as const },
  { journee: 7, date: '2026-06-21', domicile: false, adversaire: 'KaBoule', scoreCM: 35, scoreAdverse: 28, statut: 'Jouée' as const },
  { journee: 8, date: '2026-07-04', domicile: true, adversaire: 'Stenemer Bulls Steinheim', scoreCM: 41, scoreAdverse: 22, statut: 'Jouée' as const },
  { journee: 10, date: '2026-07-18', domicile: true, adversaire: 'Club Bouliste Lasauvage', scoreCM: 41, scoreAdverse: 22, statut: 'Jouée' as const },
  { journee: 11, date: '2026-07-25', domicile: false, adversaire: 'CBC Belvaux-Metzerlach', scoreCM: null, scoreAdverse: null, statut: 'Prévue' as const },
];

/** Équipes Promotion — données ILLUSTRATIVES (contrairement au National D2
 *  ci-dessus, ces chiffres ne sont pas issus d'une relecture ligne à ligne
 *  du Sheet source, juste une forme plausible pour construire la page ;
 *  à remplacer par l'import réel — voir scripts/import-csv.ts). */
export const mockEquipesPromotion = [
  { journee: 1, date: '2026-05-03', numeroEquipe: 1, categorie: 'A', type: 'M', joueurs: ['Paul Vitali', 'Marie-Louise Schmitt', 'Marco Bertemes'], partiesGagnees: 3 },
  { journee: 1, date: '2026-05-03', numeroEquipe: 2, categorie: 'B', type: 'S', joueurs: ['John Bravaccini', 'Michel Prybyla', 'Osvaldo Brunetta'], partiesGagnees: 2 },
  { journee: 2, date: '2026-05-17', numeroEquipe: 1, categorie: 'A', type: 'M', joueurs: ['Paul Vitali', 'Marie-Louise Schmitt', 'Marco Bertemes'], partiesGagnees: 4 },
  { journee: 3, date: '2026-06-07', numeroEquipe: 1, categorie: 'A', type: 'M', joueurs: ['Paul Vitali', 'Marie-Louise Schmitt', 'Marco Bertemes'], partiesGagnees: 2 },
];
