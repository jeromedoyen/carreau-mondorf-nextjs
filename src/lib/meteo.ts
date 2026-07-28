// Coordonnées du boulodrome (Mondorf-les-Bains, Luxembourg).
const LATITUDE = 49.505;
const LONGITUDE = 6.276;

export type Meteo = {
  temperature: number;
  temperatureMin: number;
  temperatureMax: number;
  probabilitePluie: number;
  icone: 'soleil' | 'nuage' | 'pluie' | 'neige' | 'orage' | 'brouillard';
  libelle: string;
};

function interpreterCodeMeteo(code: number): { icone: Meteo['icone']; libelle: string } {
  if (code === 0) return { icone: 'soleil', libelle: 'Ciel dégagé' };
  if (code <= 2) return { icone: 'soleil', libelle: 'Plutôt ensoleillé' };
  if (code === 3) return { icone: 'nuage', libelle: 'Couvert' };
  if (code === 45 || code === 48) return { icone: 'brouillard', libelle: 'Brouillard' };
  if (code >= 51 && code <= 67) return { icone: 'pluie', libelle: 'Pluie' };
  if (code >= 71 && code <= 77) return { icone: 'neige', libelle: 'Neige' };
  if (code >= 80 && code <= 82) return { icone: 'pluie', libelle: 'Averses' };
  if (code >= 95) return { icone: 'orage', libelle: 'Orage' };
  return { icone: 'nuage', libelle: 'Nuageux' };
}

/** Météo du jour à Mondorf-les-Bains — Open-Meteo (API publique gratuite,
 *  sans clé, 28/07/2026, demande Jérôme). Utilisée à la fois par l'outil
 *  météo de l'assistant (question libre : "quel temps fait-il ?") et par
 *  la carte d'accueil affichée à l'ouverture du chat. */
export async function getMeteoDuJour(): Promise<Meteo> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
    `&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=Europe%2FParis&forecast_days=1`;

  const reponse = await fetch(url, { next: { revalidate: 900 } });
  if (!reponse.ok) throw new Error(`Open-Meteo a répondu ${reponse.status}.`);
  const donnees = await reponse.json();

  const { icone, libelle } = interpreterCodeMeteo(donnees.current.weather_code);

  return {
    temperature: Math.round(donnees.current.temperature_2m),
    temperatureMin: Math.round(donnees.daily.temperature_2m_min[0]),
    temperatureMax: Math.round(donnees.daily.temperature_2m_max[0]),
    probabilitePluie: donnees.daily.precipitation_probability_max[0] ?? 0,
    icone,
    libelle,
  };
}
