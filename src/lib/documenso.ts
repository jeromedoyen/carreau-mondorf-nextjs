import 'server-only';
import { PDFDocument } from 'pdf-lib';

/** Client pour l'instance Documenso auto-hébergée (Render, 27/07/2026) —
 *  API v2 confirmée contre la doc officielle (docs.documenso.com/docs/
 *  developers/api/documents) : `POST {DOCUMENSO_API_URL}/api/v2/envelope/
 *  create`, multipart/form-data avec une partie `payload` (JSON) et une
 *  partie `files` (le PDF).
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

type PositionChamp = { positionX: number; positionY: number; width: number; height: number };

/** Dispose les zones de signature en bas de la dernière page (28/07/2026,
 *  retour Jérôme : la signature au milieu de la page 1 d'un document de 3
 *  pages n'a pas de sens, elle doit être en bas de la dernière). 1 seul
 *  signataire → centré ; jusqu'à 4 → alignés côte à côte ; au-delà →
 *  répartis sur plusieurs lignes (max 4 par ligne), en partant du bas.
 *  Toutes les valeurs sont des pourcentages de la page (convention déjà
 *  utilisée par l'API Documenso, cf. l'ancien positionnement en dur). */
function calculerPositionsSignature(nombre: number): PositionChamp[] {
  const MARGE_X = 8;
  const LARGEUR_MAX = 32;
  const HAUTEUR = 7;
  const ECART_X = 4;
  const ECART_Y = 3;
  const Y_BAS = 88; // bas de la zone signable, proche du pied de page

  if (nombre === 1) {
    return [{ positionX: 50 - LARGEUR_MAX / 2, positionY: Y_BAS, width: LARGEUR_MAX, height: HAUTEUR }];
  }

  const colonnes = Math.min(nombre, 4);
  const lignes = Math.ceil(nombre / colonnes);
  const largeurDisponible = 100 - 2 * MARGE_X;
  const largeur = Math.min(LARGEUR_MAX, (largeurDisponible - (colonnes - 1) * ECART_X) / colonnes);

  const positions: PositionChamp[] = [];
  for (let i = 0; i < nombre; i++) {
    const ligne = Math.floor(i / colonnes);
    const colonnesSurCetteLigne = Math.min(colonnes, nombre - ligne * colonnes);
    const largeurLigne = colonnesSurCetteLigne * largeur + (colonnesSurCetteLigne - 1) * ECART_X;
    const debutX = 50 - largeurLigne / 2;
    const col = i % colonnes;
    positions.push({
      positionX: debutX + col * (largeur + ECART_X),
      positionY: Y_BAS - (lignes - 1 - ligne) * (HAUTEUR + ECART_Y),
      width: largeur,
      height: HAUTEUR,
    });
  }
  return positions;
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

  const document = await PDFDocument.load(pdfBuffer);
  const dernierePage = document.getPageCount();
  const positions = calculerPositionsSignature(signataires.length);

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
          page: dernierePage,
          ...positions[index],
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
