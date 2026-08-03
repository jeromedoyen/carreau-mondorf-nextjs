import 'server-only';
import { randomBytes } from 'crypto';
import { generateObject } from 'ai';
import { google } from '@ai-sdk/google';
import type { SupabaseClient } from '@supabase/supabase-js';
import { schemaDeclarationVocale, type DeclarationVocaleExtraite } from '@/lib/schemas/declarationVocale';
import { rapprocherNom, type Licencie } from '@/lib/fuzzyMatch';

/** Logique métier de la déclaration vocale, hors 'use server' : ces
 *  fonctions sont appelées aussi bien par la Server Action (déclaration
 *  initiale) que par le webhook e-mail entrant (réponse de clarification),
 *  qui n'a pas de session utilisateur. Les garder ici évite de les exposer
 *  comme Server Actions appelables depuis le navigateur. */

export type Ambiguite = { champ: string; question: string };

/** Envoie l'audio au service Render (faster-whisper) et renvoie le texte.
 *  Service gratuit mis en veille après inactivité : le premier appel après
 *  une pause paie un réveil de plusieurs secondes, d'où le timeout large. */
export async function transcrireAudio(audio: Blob, nomFichier: string): Promise<string> {
  const url = process.env.NOTES_VOCALES_URL;
  const secret = process.env.NOTES_VOCALES_SECRET;
  if (!url || !secret) {
    throw new Error(
      "Le service de transcription n'est pas encore branché : déploie services/notes-vocales sur Render avec " +
        'TRANSCRIPTION_API_SECRET, puis renseigne NOTES_VOCALES_URL et NOTES_VOCALES_SECRET (.env.local en local, ' +
        'variables du projet côté Vercel).'
    );
  }

  const formulaire = new FormData();
  formulaire.append('fichier', audio, nomFichier);

  const reponse = await fetch(`${url.replace(/\/$/, '')}/transcrire`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}` },
    body: formulaire,
    signal: AbortSignal.timeout(120_000),
  });
  if (!reponse.ok) {
    throw new Error(`Transcription indisponible (${reponse.status}). Réessaie dans un instant.`);
  }
  const { texte } = (await reponse.json()) as { texte: string };
  return (texte || '').trim();
}

const CONSIGNE_EXTRACTION = `Tu analyses la déclaration orale d'un joueur de pétanque luxembourgeois qui enregistre sa participation à un concours pour son équipe.
Extrait uniquement ce qui est réellement dit. N'invente jamais une valeur : si une information n'est pas prononcée, mets null (ou une liste vide pour les partenaires).
Les noms de personnes doivent être restitués tels que prononcés, sans correction orthographique.
Le montant d'inscription est celui payé par l'équipe entière, en euros.`;

export async function extraireDeclaration(transcript: string): Promise<DeclarationVocaleExtraite> {
  const { object } = await generateObject({
    model: google('gemini-flash-latest'),
    schema: schemaDeclarationVocale,
    system: CONSIGNE_EXTRACTION,
    prompt: transcript,
  });
  return object;
}

/** Rapproche les noms dictés des licenciés de la saison. Tout nom non
 *  résolu remonte en ambiguïté plutôt que d'être ignoré silencieusement :
 *  oublier un partenaire fausse le remboursement autant qu'en inventer un. */
export function resoudrePartenaires(
  nomsDictes: string[],
  licencies: Licencie[],
  exclureId: number
): { ids: number[]; ambiguites: Ambiguite[] } {
  const candidats = licencies.filter((l) => l.id !== exclureId);
  const ids: number[] = [];
  const ambiguites: Ambiguite[] = [];

  for (const nom of nomsDictes) {
    const resultat = rapprocherNom(nom, candidats);
    if (resultat.trouve) {
      if (!ids.includes(resultat.licencie.id)) ids.push(resultat.licencie.id);
      continue;
    }
    const suggestions = resultat.candidats.map((c) => `${c.prenom} ${c.nom}`).join(', ');
    ambiguites.push({
      champ: `partenaire:${nom}`,
      question:
        resultat.raison === 'ambigu'
          ? `Quand tu dis « ${nom} », tu parles de qui exactement ? (${suggestions})`
          : `Je n'ai pas reconnu « ${nom} » parmi les licenciés. Peux-tu me donner son nom complet ?`,
    });
  }

  return { ids, ambiguites };
}

/** Liste ce qui manque encore pour créer une participation exploitable.
 *
 *  Seul le club l'est réellement : depuis la migration 0054, une
 *  déclaration vocale est remboursée au forfait par personne
 *  (parametres_club.montant_remboursement_concours), donc le prix
 *  d'inscription n'a plus à être dit — c'était la principale cause de
 *  relance inutile lors du premier test. */
export function listerAmbiguitesChamps(extrait: DeclarationVocaleExtraite): Ambiguite[] {
  const ambiguites: Ambiguite[] = [];
  if (!extrait.club?.trim()) {
    ambiguites.push({ champ: 'club', question: 'Dans quelle ville / quel club se déroule le concours ?' });
  }
  return ambiguites;
}

/** Le concours tombe-t-il dans le calendrier fédéral ? Renseigne
 *  hors_calendrier automatiquement, là où la saisie manuelle demande au
 *  licencié de cocher la case lui-même. En cas de doute on considère le
 *  concours hors calendrier : c'est le cas le plus fréquent pour un
 *  concours ouvert, et cela n'empêche aucun remboursement. */
export async function estAuCalendrierFederation(
  supabase: SupabaseClient,
  saison: string,
  date: string
): Promise<boolean> {
  // Rapprochement sur la seule date : suffisant en pratique (un concours
  // fédéral occupe la journée) et sans risque de faux positif coûteux —
  // hors_calendrier n'influence pas le montant remboursé, seulement le
  // classement de la ligne pour la trésorerie.
  const { data } = await supabase
    .from('calendrier_federation')
    .select('id')
    .eq('saison', saison)
    .eq('date', date)
    .eq('supprime', false)
    .limit(1);
  return !!data?.length;
}

export function genererJeton(): string {
  return randomBytes(12).toString('hex');
}

/** Adresse de réponse porteuse du jeton (concours+<jeton>@...). Le
 *  plus-addressing survit aux réponses des clients mail, contrairement à
 *  un marqueur dans l'objet, que beaucoup traduisent ou tronquent. */
export function adresseReponse(jeton: string): string | null {
  const base = process.env.CONCOURS_REPLY_TO;
  if (!base || !base.includes('@')) return null;
  const [locale, domaine] = base.split('@');
  return `${locale}+${jeton}@${domaine}`;
}

export function extraireJetonAdresse(adresse: string): string | null {
  const correspondance = /\+([a-f0-9]{16,})@/i.exec(adresse || '');
  return correspondance ? correspondance[1] : null;
}

export function resumerExtraction(extrait: DeclarationVocaleExtraite, date: string): string {
  const morceaux = [
    extrait.club ? `concours à ${extrait.club}` : 'concours (lieu à préciser)',
    `le ${date}`,
    extrait.partenaires.length ? `avec ${extrait.partenaires.join(', ')}` : null,
    extrait.inscriptionMontant ? `${extrait.inscriptionMontant} € d'inscription` : null,
  ].filter(Boolean);
  return morceaux.join(', ');
}
