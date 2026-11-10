'use server';

import { createClient } from '@/lib/supabase/server';
import { rapprocherNom, type Licencie } from '@/lib/fuzzyMatch';
import { analyserTableau, type EntreeImport } from '@/lib/tournoi/import';
import { lireListeParIA } from '@/lib/tournoi/lectureIA';

/**
 * Une ligne prête pour l'écran de correction : ce que le fichier ou la photo a
 * donné, plus la proposition de rapprochement avec le registre du club.
 *
 * `statut` dit à l'organisateur ce qu'il doit regarder :
 *   - `trouve`  : un licencié correspond nettement, la ligne est pré-remplie ;
 *   - `ambigu`  : plusieurs homonymes plausibles, il faut choisir ;
 *   - `inconnu` : personne ne correspond — invité, ou nom mal lu.
 */
export type LigneImport = {
  nomLu: string;
  equipeDepart: number | null;
  /** Club de l'équipe lu dans le document (« Belvaux », « Kayl / Mondorf »), ou null. */
  club: string | null;
  personneId: number | null;
  nomRegistre: string | null;
  statut: 'trouve' | 'ambigu' | 'inconnu';
  candidats: { id: number; nom: string }[];
};

type Resultat<T> = { ok: true; donnees: T } | { ok: false; error: string };

async function contexteCA() {
  const supabase = await createClient();
  const { data } = await supabase.rpc('est_membre_ca');
  return { supabase, ca: !!data };
}

async function chargerRegistre(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<Licencie[]> {
  const { data } = await supabase
    .from('personnes')
    .select('id, nom, prenom')
    .eq('supprime', false);
  return (data ?? []).map((p) => ({
    id: p.id as number,
    nom: (p.nom as string) ?? '',
    prenom: (p.prenom as string) ?? '',
  }));
}

/**
 * Rapproche des noms lus du registre du club. Réutilise `rapprocherNom()`
 * (fuzzyMatch), qui refuse délibérément de trancher entre deux homonymes
 * plausibles — dans un import, deviner à la place de l'organisateur ferait
 * jouer quelqu'un sous le nom d'un autre.
 */
export async function rapprocherParticipants(
  entrees: EntreeImport[],
): Promise<Resultat<LigneImport[]>> {
  const { supabase, ca } = await contexteCA();
  if (!ca) return { ok: false, error: 'Action réservée aux membres du CA.' };
  if (entrees.length === 0) return { ok: false, error: 'Aucun nom à rapprocher.' };
  if (entrees.length > 200) return { ok: false, error: 'Liste trop longue (200 participants au maximum).' };

  const registre = await chargerRegistre(supabase);
  const nomComplet = (l: Licencie) => `${l.prenom} ${l.nom}`.trim();

  // Un licencié déjà attribué à une ligne ne peut pas l'être à une autre : sinon
  // deux lignes pointeraient la même personne et l'enregistrement échouerait.
  const pris = new Set<number>();

  const lignes: LigneImport[] = entrees.map((e) => {
    const r = rapprocherNom(e.nom, registre);
    if (r.trouve && !pris.has(r.licencie.id)) {
      pris.add(r.licencie.id);
      return {
        nomLu: e.nom,
        equipeDepart: e.equipeDepart,
        club: e.club,
        personneId: r.licencie.id,
        nomRegistre: nomComplet(r.licencie),
        statut: 'trouve',
        candidats: [],
      };
    }
    const candidats = (r.trouve ? [r.licencie] : r.candidats)
      .filter((c) => !pris.has(c.id))
      .map((c) => ({ id: c.id, nom: nomComplet(c) }));
    return {
      nomLu: e.nom,
      equipeDepart: e.equipeDepart,
      club: e.club,
      personneId: null,
      nomRegistre: null,
      statut: candidats.length > 0 ? 'ambigu' : 'inconnu',
      candidats,
    };
  });

  return { ok: true, donnees: lignes };
}

/* ------------------------------------------------------------------- IA */

const TYPES_ACCEPTES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

/**
 * Vercel refuse toute requête de plus de 4,5 Mo, avant même que le code ne
 * tourne : au-delà, mieux vaut le dire clairement. Le navigateur réduit les
 * photos avant l'envoi (TournoiImport) ; seuls les PDF arrivent à leur taille.
 * `bodySizeLimit` (next.config.ts) est réglé sur la même valeur.
 */
const TAILLE_MAX = 3 * 1024 * 1024;

/**
 * Lit une photo ou un PDF de liste d'équipes. Le résultat est une PROPOSITION :
 * il passe systématiquement par l'écran de correction avant d'être enregistré.
 * Sur du manuscrit, la lecture est approximative — c'est assumé et annoncé.
 */
export async function analyserFichierParticipants(
  base64: string,
  mediaType: string,
): Promise<Resultat<{ entrees: EntreeImport[]; aDesEquipes: boolean }>> {
  const { ca } = await contexteCA();
  if (!ca) return { ok: false, error: 'Action réservée aux membres du CA.' };

  if (!TYPES_ACCEPTES.includes(mediaType)) {
    return { ok: false, error: 'Format non pris en charge : envoyez une photo (JPEG, PNG, WEBP) ou un PDF.' };
  }
  // base64 pèse ~4/3 de l'original
  if (base64.length * 0.75 > TAILLE_MAX) {
    return { ok: false, error: 'Fichier trop lourd (3 Mo au maximum). Pour un PDF, exportez-le en plus léger ou envoyez une photo.' };
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return { ok: false, error: "La lecture par IA n'est pas configurée sur cet environnement." };
  }

  // Le délai, la réflexion et le relais entre deux modèles vivent dans
  // `lireListeParIA` — voir ce fichier pour les mesures qui les justifient.
  const resultatIA = await lireListeParIA(base64, mediaType);
  if (!resultatIA.ok) {
    const messages = {
      passager:
        "Le service de lecture par IA est surchargé ou met trop de temps à répondre (le plus souvent, c'est passager). Réessayez dans une minute, ou utilisez l'import Excel/CSV.",
      // Réessayer dans une minute ne servirait à rien : on ne le propose pas.
      'quota-jour':
        "Le quota gratuit de lecture par IA est atteint pour aujourd'hui. Utilisez l'import Excel/CSV, ou réessayez demain.",
      autre: `Lecture impossible : ${resultatIA.message}`,
    } as const;
    return { ok: false, error: messages[resultatIA.raison] };
  }
  const objet = resultatIA.objet;

  // On repasse par l'analyseur de tableau : il applique le même nettoyage
  // (numéros collés, cellules parasites, colonne « Club » mise de côté) que
  // l'import de fichier, donc les deux chemins produisent exactement la même
  // chose. La lecture de l'IA est remise en forme de tableau avec son en-tête.
  const largeur = Math.max(1, ...objet.equipes.map((eq) => eq.joueurs.length));
  const grille: string[][] = [
    ['Série', ...Array.from({ length: largeur }, (_, i) => `Joueur ${i + 1}`), 'Club'],
    ...objet.equipes.map((eq) => [
      objet.aDesEquipes && eq.numero != null ? String(eq.numero) : '',
      ...eq.joueurs,
      ...Array<string>(largeur - eq.joueurs.length).fill(''),
      objet.aDesEquipes ? (eq.club ?? '') : '',
    ]),
  ];

  const lecture = analyserTableau(grille);
  const entrees = objet.aDesEquipes
    ? lecture.entrees
    : lecture.entrees.map((e) => ({ ...e, equipeDepart: null, club: null }));

  if (entrees.length === 0) {
    return { ok: false, error: "Aucun nom lisible n'a été trouvé sur ce document." };
  }
  return { ok: true, donnees: { entrees, aDesEquipes: objet.aDesEquipes } };
}
