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
  // Bas de la zone signable. Était à 88 puis remonté à 80 le 28/07/2026 (trop
  // bas visuellement) ; redescendu à 90 le 08/08/2026 (retour Jérôme, cette
  // fois pour l'effet inverse) : Documenso ne détecte pas la fin du texte
  // d'un document, la case peut donc chevaucher un paragraphe qui va jusqu'en
  // bas de page — plus elle est proche du bord, moins ce risque est probable.
  // 90 + HAUTEUR (7) = 97 : reste sur la page avec une marge de sécurité de 3%.
  const Y_BAS = 90;

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
}): Promise<{ envelopeId: string; urlsSignature: Record<string, string> }> {
  const { url, token } = configuration();

  const document = await PDFDocument.load(pdfBuffer);
  const dernierePage = document.getPageCount();
  const positions = calculerPositionsSignature(signataires.length);

  // Part de la case réservée au nom auto-rempli, à gauche de la signature
  // (08/08/2026, retour Jérôme : sur un document multi-signataires, rien ne
  // garantit qu'un nom écrit à la main dans le PDF corresponde à la case
  // effectivement signée par cette personne — `NAME` est un type de champ
  // Documenso natif, rempli automatiquement avec le nom du destinataire au
  // moment de la signature, donc structurellement lié au bon signataire).
  const PART_LARGEUR_NOM = 0.42;

  const payload = {
    type: 'DOCUMENT',
    title: titre,
    recipients: signataires.map((s, index) => {
      const boite = positions[index];
      const largeurNom = boite.width * PART_LARGEUR_NOM;
      const largeurSignature = boite.width - largeurNom;
      return {
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
            type: 'NAME',
            page: dernierePage,
            positionX: boite.positionX,
            positionY: boite.positionY,
            width: largeurNom,
            height: boite.height,
          },
          {
            identifier: 0,
            type: 'SIGNATURE',
            page: dernierePage,
            positionX: boite.positionX + largeurNom,
            positionY: boite.positionY,
            width: largeurSignature,
            height: boite.height,
          },
        ],
      };
    }),
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

  /** URL de signature directe par destinataire (04/08/2026, demande
   *  Jérôme — flux "auto-signature" du protocole manifestation : le
   *  demandeur signe lui-même son propre document tout de suite, sans
   *  attendre l'e-mail). Le token de signature apparaît dans la réponse de
   *  /distribute — nom de champ non documenté publiquement, on essaie les
   *  variantes plausibles (`token`/`signingToken`) et on retombe sur le
   *  flux e-mail existant si absent plutôt que de faire planter l'envoi. */
  const urlsSignature: Record<string, string> = {};
  try {
    const donneesDistribution = await reponseDistribution.json();
    const recipients = donneesDistribution?.recipients ?? donneesDistribution?.envelope?.recipients ?? [];
    for (const r of recipients as Record<string, unknown>[]) {
      const jeton = (r.token as string | undefined) ?? (r.signingToken as string | undefined);
      const email = r.email as string | undefined;
      if (jeton && email) urlsSignature[email] = `${url}/sign/${jeton}`;
    }
  } catch {
    // Réponse non-JSON ou format inattendu : pas bloquant, urlsSignature reste vide.
  }

  return { envelopeId: String(envelopeId), urlsSignature };
}

/** Télécharge le PDF signé final d'une enveloppe complète (28/07/2026,
 *  demande Jérôme — endpoint découvert via /api/v2/openapi.json, aucune
 *  doc publique ne le mentionnait) : il faut d'abord relire l'enveloppe
 *  pour retrouver l'`envelopeItemId` (pas stocké en base, seul
 *  `envelopeId` l'est), puis appeler
 *  `/api/v2/envelope/item/{envelopeItemId}/download` qui renvoie
 *  directement le PDF (pas de JSON intermédiaire). Suppose une enveloppe à
 *  un seul document, cohérent avec creerEnveloppe() qui n'en envoie
 *  jamais qu'un. */
export async function telechargerDocumentSigne(envelopeId: string): Promise<Buffer> {
  const { url, token } = configuration();

  const reponseEnveloppe = await fetch(`${url}/api/v2/envelope/${envelopeId}`, {
    headers: { Authorization: token },
    cache: 'no-store',
  });
  if (!reponseEnveloppe.ok) {
    throw new Error(`Impossible de relire l'enveloppe (${reponseEnveloppe.status}).`);
  }
  const enveloppe = await reponseEnveloppe.json();
  const envelopeItemId = enveloppe?.envelopeItems?.[0]?.id;
  if (!envelopeItemId) throw new Error("Aucun document trouvé dans l'enveloppe.");

  const reponseTelechargement = await fetch(`${url}/api/v2/envelope/item/${envelopeItemId}/download`, {
    headers: { Authorization: token },
    cache: 'no-store',
  });
  if (!reponseTelechargement.ok) {
    throw new Error(`Échec du téléchargement du PDF signé (${reponseTelechargement.status}).`);
  }

  return Buffer.from(await reponseTelechargement.arrayBuffer());
}

/** Statut courant d'une enveloppe — sondage direct de l'API (28/07/2026,
 *  demande Jérôme) plutôt qu'un webhook Documenso : les webhooks ne sont
 *  pas disponibles sur l'édition Community auto-hébergée sans passer sur
 *  une offre payante, cette route GET (même famille que /create et
 *  /distribute) l'est. Retourne `null` si l'appel échoue plutôt que de
 *  lever une erreur — utilisé au chargement de /outils/signatures, une
 *  panne de l'API Documenso ne doit jamais empêcher d'afficher la page. */
export async function obtenirStatutEnveloppe(
  envelopeId: string
): Promise<{ recipients: { email: string; signingStatus?: string; signedAt?: string | null }[] } | null> {
  try {
    const { url, token } = configuration();
    const reponse = await fetch(`${url}/api/v2/envelope/${envelopeId}`, {
      headers: { Authorization: token },
      cache: 'no-store',
    });
    if (!reponse.ok) return null;

    const donnees = await reponse.json();
    const recipients = donnees?.recipients ?? donnees?.envelope?.recipients;
    if (!Array.isArray(recipients)) return null;

    return {
      recipients: recipients.map((r: Record<string, unknown>) => ({
        email: String(r.email ?? ''),
        signingStatus: r.signingStatus as string | undefined,
        signedAt: (r.signedAt as string | null | undefined) ?? null,
      })),
    };
  } catch {
    return null;
  }
}
