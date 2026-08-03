import { z } from 'zod';

/** Ce qu'on cherche à tirer d'un vocal du type : « Je suis aujourd'hui au
 *  concours de Differdange, je déclare pour mon équipe, je suis avec Paul
 *  et Jean-Marie, on a payé 30 euros d'inscription, repas compris. »
 *
 *  Tous les champs sont nullables : le modèle ne doit JAMAIS inventer ce
 *  qui n'a pas été dit. Un null déclenche une question de clarification —
 *  c'est le comportement voulu, pas un échec. */
export const schemaDeclarationVocale = z.object({
  club: z
    .string()
    .nullable()
    .describe("Ville ou club organisateur du concours, tel que prononcé. null si non mentionné."),
  concours: z
    .string()
    .nullable()
    .describe("Nom ou nature du concours (ex. 'triplette', 'concours de la commune'). null si non mentionné."),
  date: z
    .string()
    .nullable()
    .describe("Date au format AAAA-MM-JJ si une date explicite est donnée. null si le locuteur dit seulement « aujourd'hui » ou ne dit rien."),
  partenaires: z
    .array(z.string())
    .describe("Noms des coéquipiers cités, tels que prononcés, sans le déclarant lui-même. Liste vide si aucun n'est cité."),
  inscriptionMontant: z
    .number()
    .nullable()
    .describe("Montant total d'inscription payé par l'équipe, en euros. null si non mentionné."),
  repasInclus: z
    .boolean()
    .nullable()
    .describe("true seulement si le locuteur dit explicitement que le repas est compris dans l'inscription. null si le sujet n'est pas abordé."),
  seDeclareChefEquipe: z
    .boolean()
    .describe("true si le locuteur indique déclarer pour son équipe / en tant que chef d'équipe."),
});

export type DeclarationVocaleExtraite = z.infer<typeof schemaDeclarationVocale>;

/** Réponse du licencié à l'e-mail de clarification. Mêmes règles : ce qui
 *  n'est pas dit reste null, on ne comble pas les trous par déduction. */
export const schemaReponseClarification = z.object({
  club: z.string().nullable(),
  partenaires: z.array(z.string()).describe('Noms de coéquipiers cités dans la réponse, y compris ceux déjà connus.'),
  inscriptionMontant: z.number().nullable(),
  repasInclus: z.boolean().nullable(),
});
