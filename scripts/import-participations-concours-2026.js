/** Import ponctuel (02/08/2026) des participations Promotion + Championnat
 *  national depuis PARTICIPATION EXTERIEURE 2026.xlsx (fourni par Michel),
 *  demande via /pb #112. Exclut volontairement :
 *  - les 3 colonnes qui correspondent au National D2 (déjà générées
 *    automatiquement depuis rencontres_d2/parties_d2) : STEINHEIM 11/04,
 *    LASAUVAGE 25/04, KABOULE 21/06.
 *  - 2 dates ambiguës sans correspondance fiable dans les calendriers déjà
 *    en base (SCHIFFLANGE 09/05, TRIPLE 13/05) — Jérôme doit d'abord
 *    vérifier avec Michel s'il s'agit d'une erreur de saisie.
 *  Pas de chef d'équipe (demande explicite de Jérôme) : chaque joueur est
 *  remboursé individuellement, comme le Championnat D2.
 *
 *  Rapprochement de noms tolérant (Excel = "NOM. PRENOM" ou "NOM PRENOM",
 *  parfois mal orthographié — OLLINGER/OLINGER, SZCZUCKI/SCZUCCIK...) —
 *  même principe que rapprocherNomJoueur_() côté Apps Script : nom exact
 *  puis, à défaut, distance de Levenshtein tolérée sur le nom + préfixe sur
 *  le prénom. */
require('dotenv').config({ path: '.env.local' });
const xlsx = require('xlsx');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
const SAISON = '2026';

const COLONNES_A_IMPORTER = {
  SCHIERREN: { date: '2026-04-12', type: 'Promotion', club: 'Schieren' },
  "BOULE D'OR": { date: '2026-04-19', type: 'Promotion', club: 'Esch/Alzette' },
  DUDELANGE: { date: '2026-05-02', type: 'Promotion', club: 'Dudelange' },
  STEINHEIM_2: { date: '2026-05-17', type: 'Promotion', club: 'Steinheim' },
  BELVAUX: { date: '2026-07-05', type: 'Promotion', club: 'Belvaux' },
  STEINFORT: { date: '2026-07-12', type: 'Promotion', club: 'Steinfort' },
  'TRIPLE MIXTE': { date: '2026-05-23', type: 'Concours_National', club: 'Boulodrome National, Belvaux' },
  'T à T': { date: '2026-05-30', type: 'Concours_National', club: 'Boulodrome National, Belvaux' },
};

function excelDateToISO(serial) {
  const epoch = new Date(Date.UTC(1899, 11, 30));
  return new Date(epoch.getTime() + serial * 86400000).toISOString().slice(0, 10);
}

function sansAccents(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      d[i][j] = a[i - 1] === b[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1]);
    }
  }
  return d[m][n];
}

/** "BAC. YVES" -> {nom:"BAC", prenom:"YVES"} ; "LE BERRE YAN" -> {nom:"LE BERRE", prenom:"YAN"} */
function parserNomExcel(brut) {
  const tokens = String(brut).replace(/\./g, ' ').split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return { nom: sansAccents(tokens[0] || ''), prenom: '' };
  const prenom = tokens[tokens.length - 1];
  const nom = tokens.slice(0, -1).join(' ');
  return { nom: sansAccents(nom), prenom: sansAccents(prenom) };
}

function trouverPersonne(nomExcel, personnes) {
  const { nom, prenom } = parserNomExcel(nomExcel);

  // Passe 1 : nom exact + prénom exact ou préfixe (gère "ANTONIO" vs "José Antonio").
  let trouve = personnes.find((p) => {
    const nomP = sansAccents(p.nom);
    const prenomP = sansAccents(p.prenom);
    return nomP === nom && (prenomP === prenom || prenomP.includes(prenom) || prenom.includes(prenomP));
  });
  if (trouve) return trouve;

  // Passe 2 : nom tolérant (Levenshtein <= 2) + prénom exact ou inclus.
  trouve = personnes.find((p) => {
    const nomP = sansAccents(p.nom);
    const prenomP = sansAccents(p.prenom);
    return levenshtein(nomP, nom) <= 2 && (prenomP === prenom || prenomP.includes(prenom) || prenom.includes(prenomP));
  });
  return trouve || null;
}

async function main() {
  const wb = xlsx.readFile('C:/Users/jerom/Downloads/PARTICIPATION EXTERIEURE 2026.xlsx');
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const lieux = data[0];
  const dates = data[1];

  const { data: personnes } = await supabase.from('personnes').select('id, nom, prenom').eq('supprime', false);

  const colonnesRetenues = [];
  let vuSteinheim = 0;
  for (let i = 1; i < lieux.length; i++) {
    const lieuBrut = lieux[i];
    if (!lieuBrut) continue;
    if (lieuBrut === 'STEINHEIM') {
      vuSteinheim++;
      if (vuSteinheim === 2) colonnesRetenues.push({ index: i, config: COLONNES_A_IMPORTER.STEINHEIM_2 });
      continue;
    }
    const config = COLONNES_A_IMPORTER[lieuBrut];
    if (config) colonnesRetenues.push({ index: i, config });
  }

  const lignes = [];
  const nomsIntrouvables = new Set();

  for (const { index, config } of colonnesRetenues) {
    const dateExcel = excelDateToISO(dates[index]);
    if (dateExcel !== config.date) {
      console.warn(`Écart de date pour colonne index ${index} : Excel=${dateExcel} attendu=${config.date} — colonne ignorée par sécurité.`);
      continue;
    }
    for (let r = 2; r < data.length; r++) {
      const nomExcel = data[r][0];
      if (!nomExcel || data[r][index] !== 1) continue;
      const personne = trouverPersonne(nomExcel, personnes);
      if (!personne) {
        nomsIntrouvables.add(nomExcel);
        continue;
      }
      lignes.push({
        saison: SAISON,
        type: config.type,
        source: 'auto',
        personne_id: personne.id,
        chef_equipe_id: null,
        date: config.date,
        club: config.club,
        pays: 'LU',
        notes: 'Import historique — feuille Excel fournie par Michel (02/08/2026)',
      });
    }
  }

  console.log(`${lignes.length} ligne(s) à insérer.`);
  if (nomsIntrouvables.size) {
    console.log('Noms non reconnus dans le registre (ignorés) :', [...nomsIntrouvables].join(', '));
  }
  if (!lignes.length) return;

  let inserees = 0;
  let ignorees = 0;
  for (const ligne of lignes) {
    const { data: existant } = await supabase
      .from('participations_concours')
      .select('id')
      .eq('personne_id', ligne.personne_id)
      .eq('date', ligne.date)
      .eq('type', ligne.type)
      .eq('supprime', false)
      .maybeSingle();
    if (existant) {
      ignorees++;
      continue;
    }
    const { error } = await supabase.from('participations_concours').insert(ligne);
    if (error) {
      console.error('Erreur insertion', ligne, error.message);
      continue;
    }
    inserees++;
  }
  console.log(`Terminé : ${inserees} insérée(s), ${ignorees} déjà existante(s) ignorée(s).`);
}

main();
