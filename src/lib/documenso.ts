import 'server-only';

/** Client pour l'instance Documenso auto-hébergée (Render, 27/07/2026) —
 *  API v2 confirmée contre la doc officielle (docs.documenso.com/docs/
 *  developers/api/documents) : `POST {DOCUMENSO_API_URL}/api/v2/envelope/
 *  create`, multipart/form-data avec une partie `payload` (JSON) et une
 *  partie `files` (le PDF). Chaque signataire a besoin d'un champ
 *  SIGNATURE positionné sur la page — comme nos PDF n'ont pas de mise en
 *  page connue à l'avance, on les empile près du bas de la page 1 plutôt
 *  que de deviner un emplacement pertinent ; le signataire peut toujours
 *  déplacer son champ dans l'interface de signature.
 *
 *  `envelope/create` ne fait que créer un BROUILLON — constaté en
 *  pratique (deux essais restés en statut "Brouillon" côté Documenso,
 *  27/07/2026) : il faut ensuite `POST .../envelope/distribute` avec
 *  `{ envelopeId }` pour déclencher réellement l'envoi aux signataires. */
function configuration() {
  const url = process.env.DOCUMENSO_API_URL;
  const token = process.env.DOCUMENSO_API_TOKEN;
  if (!url || !token) throw new Error('DOCUMENSO_API_URL / DOCUMENSO_API_TOKEN manquants.');
  return { url: url.replace(/\/$/, ''), token };
}

export async function creerEnveloppe({
  titre,
  pdfBuffer,
  nomFichier,
  signataires,
}: {
  titre: string;
  pdfBuffer: Buffer;
  nomFichier: string;
  signataires: { email: string; nom: string }[];
}): Promise<{ envelopeId: string }> {
  const { url, token } = configuration();

  const payload = {
    type: 'DOCUMENT',
    title: titre,
    recipients: signataires.map((s, index) => ({
      email: s.email,
      name: s.nom,
      role: 'SIGNER',
      fields: [
        {
          // `identifier` désigne le fichier de l'enveloppe concerné (on
          // n'en envoie toujours qu'un seul ici), pas le signataire —
          // erreur "Document data not found" constatée en pratique avec
          // 2 signataires quand on y mettait l'index du signataire
          // (27/07/2026).
          identifier: 0,
          type: 'SIGNATURE',
          page: 1,
          positionX: 10,
          positionY: 75 - index * 8,
          width: 30,
          height: 6,
        },
      ],
    })),
    meta: {
      subject: `Signature demandée — ${titre}`,
      message: `Bonjour, merci de signer le document "${titre}" pour le Carreau Boules et Pétanque Mondorf.`,
    },
  };

  const formulaire = new FormData();
  formulaire.append('payload', JSON.stringify(payload));
  formulaire.append('files', new Blob([new Uint8Array(pdfBuffer)], { type: 'application/pdf' }), nomFichier);

  const reponse = await fetch(`${url}/api/v2/envelope/create`, {
    method: 'POST',
    headers: { Authorization: token },
    body: formulaire,
  });

  if (!reponse.ok) {
    throw new Error(`Documenso a répondu ${reponse.status} : ${await reponse.text()}`);
  }

  const donnees = await reponse.json();
  const envelopeId = donnees?.id ?? donnees?.envelopeId ?? donnees?.documentId;
  if (!envelopeId) throw new Error('Réponse Documenso inattendue (id introuvable).');

  const reponseDistribution = await fetch(`${url}/api/v2/envelope/distribute`, {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify({ envelopeId }),
  });
  if (!reponseDistribution.ok) {
    throw new Error(
      `Enveloppe créée mais échec de l'envoi (${reponseDistribution.status}) : ${await reponseDistribution.text()}`
    );
  }

  return { envelopeId: String(envelopeId) };
}
