import 'server-only';

/** Client pour l'instance Documenso auto-hébergée (Render, 27/07/2026) —
 *  API v2 confirmée contre la doc officielle (docs.documenso.com/docs/
 *  developers/api/documents) : `POST {DOCUMENSO_API_URL}/api/v2/envelope/
 *  create`, multipart/form-data avec une partie `payload` (JSON) et une
 *  partie `files` (le PDF). Chaque signataire a besoin d'un champ
 *  SIGNATURE positionné sur la page — comme nos PDF n'ont pas de mise en
 *  page connue à l'avance, on les empile près du bas de la page 1 plutôt
 *  que de deviner un emplacement pertinent ; le signataire peut toujours
 *  déplacer son champ dans l'interface de signature. Pas vérifié contre
 *  un vrai envoi complet à l'écriture de ce fichier — si la réponse ne
 *  correspond pas, regarder ici en premier. */
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
          identifier: index,
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

  return { envelopeId: String(envelopeId) };
}
