// Port direct de ALIAS_CLUBS_D2_ / canoniserClubD2_ (carreau-mondorf-app/DivisionD2Backend.gs).
// Un même club peut apparaître sous plusieurs noms selon la saison ou même au
// sein d'un même document FLBP — attention à ne pas confondre avec une vraie
// montée/descente de division (ex. Pétanque & Boules Kayl a réellement changé
// de division, ce n'est pas un alias).

const ALIAS_CLUBS_D2: Record<string, string> = {
  'STENEMER BULLS': 'Stenemer Bulls Steinheim',
  'STENEMER BULLS STEINHEIM': 'Stenemer Bulls Steinheim',
  '"A RIFAT" STEINFORT': 'A Rifat Steinfort',
  'A RIFAT STEINFORT': 'A Rifat Steinfort',
  'KABOULE KAERJENG': 'KaBoule',
  'KABOULE BASCHARAGE': 'KaBoule',
  'KABOULE': 'KaBoule',
  'C.B.C. BELVAUX-METZERLACH': 'CBC Belvaux-Metzerlach',
  'CBC BELVAUX-METZERLACH': 'CBC Belvaux-Metzerlach',
  'CLUB BOULISTE LASAUVAGE': 'Club Bouliste Lasauvage',
  'CARREAU MONDORF': 'Carreau Mondorf',
  'SCHIERENER BULLEMETTIEN': 'Schierener Bullemettïen',
  'SCHIERENER BULLEMETTÏEN': 'Schierener Bullemettïen',
  'PETANQUE & BOULES KAYL': 'Pétanque & Boules Kayl',
  'P.B. KAYL': 'Pétanque & Boules Kayl',
};

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function canoniserClubD2(nomBrut: string | null | undefined): string {
  const brut = String(nomBrut ?? '').trim();
  if (!brut) return '';
  const cle = sansAccents(brut).toUpperCase();
  return ALIAS_CLUBS_D2[cle] ?? brut;
}
