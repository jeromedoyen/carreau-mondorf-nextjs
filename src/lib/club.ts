/** Contenu statique de la carte de visite publique — port du contenu réel de
 *  carreau-mondorf-app/CarteVisite.html (coordonnées, comité, itinéraires).
 *  Volontairement pas en base de données : ce n'est pas une donnée qui
 *  change souvent, et ça reste éditable directement dans le code par un
 *  développeur sans risque RGPD (aucune donnée personnelle sensible ici,
 *  juste les noms/rôles publics du comité déjà affichés sur la page
 *  Facebook du club). Pas de multilingue dans cette v2 pour l'instant
 *  (l'original en a 5 : FR/LB/DE/EN/IT) — à réévaluer plus tard si besoin
 *  réel, hors périmètre de la Phase A (valider le nouveau système visuel). */

export const CLUB = {
  nomComplet: 'Club Carreau Boules et Pétanque Mondorf a.s.b.l.',
  rcs: 'RCS Luxembourg F13189',
  baseline:
    'Une association sportive et conviviale à Mondorf-les-Bains, où pétanque et boules lyonnaises se pratiquent en compétition comme en loisir — ouverte à tous, dès le premier lancer.',
  boulodrome: {
    adresse: '1, rue Dr Jean Théodore Kirpach, L-5620 Mondorf-les-Bains',
    note: 'Ouvert la majeure partie de l’année (environ 220 jours en 2025)',
  },
  siegeSocial: '6, rue Dr. Auguste Schumacher, L-5654 Mondorf-les-Bains',
  cotisation: '20 EUR — carte de membre obligatoire (couverture assurance)',
  email: 'carreau.mondorf@pt.lu',
  facebook: 'https://www.facebook.com/groups/271245557161927/',
};

export const DISCIPLINES = [
  {
    titre: 'Pétanque',
    description:
      'Championnat de deuxième division FLBP, championnat de promotion, championnats nationaux et rencontres amicales avec des clubs du Luxembourg et de la Grande Région.',
  },
  {
    titre: 'Boules lyonnaises',
    description:
      'Participation régulière à des tournois internationaux, notamment en France et en Allemagne, dont le tournoi des 6 clubs à Hainburg.',
  },
  {
    titre: 'Vie associative',
    description:
      'Initiations en milieu scolaire, parties mensuelles avec l’association Blëtz a.s.b.l., soutien à Europa Donna et animations conviviales tout au long de l’année.',
  },
];

export type MembreComite = {
  initiales: string;
  nom: string;
  role: string;
  photo?: string;
};

export const COMITE: MembreComite[] = [
  { initiales: 'PV', nom: 'Paul Vitali', role: 'Président' },
  { initiales: 'JB', nom: 'John Bravaccini', role: 'Vice-président', photo: '/comite/john-bravaccini.jpg' },
  { initiales: 'MP', nom: 'Michel Prybyla', role: 'Secrétaire', photo: '/comite/michel-prybyla.jpg' },
  { initiales: 'DR', nom: 'Dominique Rousset', role: 'Trésorier', photo: '/comite/dominique-rousset.jpg' },
  { initiales: 'MB', nom: 'Marco Bertemes', role: 'Membre', photo: '/comite/marco-bertemes.jpg' },
  { initiales: 'OB', nom: 'Osvaldo Brunetta', role: 'Membre', photo: '/comite/osvaldo-brunetta.jpg' },
  { initiales: 'MJF', nom: 'Marie-Jean Flammang', role: 'Membre', photo: '/comite/marie-jean-flammang.jpg' },
];

export const ITINERAIRES = [
  {
    pays: 'Depuis la France',
    via: 'Repère : Thionville',
    distance: '~22 km',
    duree: '~25 min',
    route: "Via l'A31 puis la N16 (route de Remich) jusqu'à Mondorf-les-Bains.",
    origine: 'Thionville',
    drapeau: '🇫🇷',
  },
  {
    pays: "Depuis l'Allemagne",
    via: 'Repère : Trèves (Trier)',
    distance: '~55 km',
    duree: '~45 min',
    route: "Via l'A1/A64 direction Luxembourg, puis l'A13 vers Mondorf-les-Bains.",
    origine: 'Trier',
    drapeau: '🇩🇪',
  },
  {
    pays: 'Depuis la Belgique',
    via: 'Repère : Arlon',
    distance: '~55 km',
    duree: '~50 min',
    route: "Via l'E411/A6 puis l'A13 direction Mondorf-les-Bains.",
    origine: 'Arlon',
    drapeau: '🇧🇪',
  },
  {
    pays: 'Depuis Luxembourg-Ville',
    via: 'Repère : centre-ville',
    distance: '~30 km',
    duree: '~27 min',
    route: 'Via l’A3 direction Dudelange/Frisange, puis la N13 vers Mondorf-les-Bains.',
    origine: 'Luxembourg',
    drapeau: '🇱🇺',
  },
];
