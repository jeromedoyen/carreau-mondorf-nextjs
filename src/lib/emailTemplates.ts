/** Gabarits d'email HTML — tables + styles inline uniquement (compat
 *  clients mail, pas de flex/grid/CSS externe). Couleurs reprises telles
 *  quelles de la charte graphique v2 (globals.css). Logo référencé en
 *  `cid:logo-club` — chaque appelant doit joindre chargerLogoClub()
 *  (src/lib/email.ts) sous ce cid, sans quoi l'image casse. Une image
 *  distante bloquait par défaut dans plusieurs clients mail de bureau
 *  (pense-bête Jérôme, 27/07/2026). */
const COULEURS = {
  encre: '#241b12',
  encreDouce: '#5a4c3c',
  terracotta: '#c1522b',
  pin: '#24463a',
  sable: '#f4ecd8',
  sableCarte: '#fbf6ea',
  ligne: '#e3d5b8',
};

export function emailBienvenue({
  prenom,
  email,
  estLicencie,
}: {
  prenom: string;
  email: string;
  estLicencie: boolean;
}): string {
  const espace = estLicencie ? 'espace licenciés' : 'espace membres';
  const contenu = estLicencie
    ? 'calendrier du club, manifestations, bénévolat, statistiques de compétition, et ta propre page personnelle'
    : 'calendrier du club, manifestations, bénévolat, et ta propre page personnelle';
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.sable};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:${COULEURS.sableCarte};border-radius:16px;overflow:hidden;border:1px solid ${COULEURS.ligne};">
        <tr>
          <td style="background:${COULEURS.sable};padding:28px 32px;text-align:center;border-bottom:1px solid ${COULEURS.ligne};">
            <img src="cid:logo-club" alt="Carreau Mondorf" width="140" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COULEURS.terracotta};font-weight:600;">Bienvenue au club</p>
            <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;color:${COULEURS.encre};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;">
              Bonjour ${prenom},
            </h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">
              Ton adhésion au <strong style="color:${COULEURS.encre};">Carreau Boules et Pétanque Mondorf</strong>
              vient d'être validée — bienvenue parmi nous !
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">
              Tu as maintenant accès à l'${espace} : ${contenu}.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
              <tr>
                <td style="border-radius:10px;background:${COULEURS.terracotta};">
                  <a href="https://carreau-mondorf.com/connexion"
                     style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;border-radius:10px;">
                    Se connecter
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:${COULEURS.encreDouce};">
              Connexion avec cette adresse : <strong style="color:${COULEURS.encre};">${email}</strong>
            </p>
            <p style="margin:0;font-size:13px;line-height:1.6;color:${COULEURS.encreDouce};">
              Un code à 8 chiffres t'est envoyé par email à chaque connexion — aucun mot de passe à retenir.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${COULEURS.ligne};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${COULEURS.encreDouce};">
              À bientôt au boulodrome !<br />
              <strong style="color:${COULEURS.pin};">Le comité du Carreau Boules et Pétanque Mondorf</strong>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function carteSimple({ etiquette, titre, paragraphes, cta }: {
  etiquette: string;
  titre: string;
  paragraphes: string[];
  cta?: { href: string; texte: string };
}): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.sable};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:${COULEURS.sableCarte};border-radius:16px;overflow:hidden;border:1px solid ${COULEURS.ligne};">
        <tr>
          <td style="background:${COULEURS.sable};padding:28px 32px;text-align:center;border-bottom:1px solid ${COULEURS.ligne};">
            <img src="cid:logo-club" alt="Carreau Mondorf" width="140" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COULEURS.terracotta};font-weight:600;">${etiquette}</p>
            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${COULEURS.encre};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;">
              ${titre}
            </h1>
            ${paragraphes.map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">${p}</p>`).join('')}
            ${cta ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
              <tr>
                <td style="border-radius:10px;background:${COULEURS.terracotta};">
                  <a href="${cta.href}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;border-radius:10px;">
                    ${cta.texte}
                  </a>
                </td>
              </tr>
            </table>` : ''}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${COULEURS.ligne};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${COULEURS.encreDouce};">
              Le comité du Carreau Boules et Pétanque Mondorf
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Accusé de réception (28/07/2026, workflow adhésion bout-en-bout) — envoyé
 *  immédiatement à l'applicant après soumission du formulaire public
 *  /inscription, pour qu'il sache que sa demande est bien partie plutôt que
 *  de rester dans l'incertitude jusqu'à un éventuel appel du comité. */
export function emailConfirmationDemande({ prenom }: { prenom: string }): string {
  return carteSimple({
    etiquette: 'Demande reçue',
    titre: `Bonjour ${prenom},`,
    paragraphes: [
      `Ta demande d'adhésion au <strong style="color:${COULEURS.encre};">Carreau Boules et Pétanque Mondorf</strong> vient bien de nous parvenir.`,
      `Le comité va l'examiner et revient vers toi rapidement — pas besoin de renvoyer le formulaire.`,
    ],
  });
}

/** Alerte comité (28/07/2026) — envoyée au même moment que la confirmation
 *  ci-dessus, à l'adresse partagée du club (CLUB.email) : jusqu'ici rien ne
 *  prévenait le CA qu'une demande attendait sur /membres/demandes, il
 *  fallait penser à aller vérifier la page. */
export function emailAlerteNouvelleDemande({ nomComplet, typeDemande }: { nomComplet: string; typeDemande: string }): string {
  return carteSimple({
    etiquette: 'Nouvelle demande',
    titre: `${typeDemande} — ${nomComplet}`,
    paragraphes: [`Une nouvelle demande vient d'être soumise sur le site — à traiter sur la page "Demandes d'adhésion".`],
    cta: { href: 'https://carreau-mondorf.com/membres/demandes', texte: 'Voir la demande' },
  });
}

/** Refus (28/07/2026) — jusqu'ici un refus était un silence radio pour
 *  l'applicant (statut passé à "rejetee" sans aucune notification). */
export function emailRefusDemande({ prenom }: { prenom: string }): string {
  return carteSimple({
    etiquette: 'Ta demande',
    titre: `Bonjour ${prenom},`,
    paragraphes: [
      `Après examen, le comité du <strong style="color:${COULEURS.encre};">Carreau Boules et Pétanque Mondorf</strong> n'a pas pu donner suite à ta demande d'adhésion.`,
      `N'hésite pas à nous contacter directement si tu as des questions.`,
    ],
  });
}

/** Appel de paiement individuel (/outils/paiements) — envoyé à la demande
 *  du CA plutôt qu'automatiquement, avec le QR SEPA en pièce jointe `cid:`
 *  (voir src/lib/actions/paiements.ts) : plus fiable dans les clients mail
 *  de bureau qu'une image en `data:` URI. */
export function emailAppelPaiement({
  prenom,
  description,
  montant,
  reference,
  nomBeneficiaire,
  iban,
  bic,
}: {
  prenom: string;
  description: string;
  montant: number;
  reference: string;
  nomBeneficiaire: string;
  iban: string;
  bic: string | null;
}): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.sable};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:${COULEURS.sableCarte};border-radius:16px;overflow:hidden;border:1px solid ${COULEURS.ligne};">
        <tr>
          <td style="background:${COULEURS.sable};padding:28px 32px;text-align:center;border-bottom:1px solid ${COULEURS.ligne};">
            <img src="cid:logo-club" alt="Carreau Mondorf" width="140" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COULEURS.terracotta};font-weight:600;">Appel à cotisation</p>
            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${COULEURS.encre};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;">
              Bonjour ${prenom},
            </h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">
              Voici le détail concernant l'appel à cotisation pour le
              <strong style="color:${COULEURS.encre};">Carreau Boules et Pétanque Mondorf</strong> — scanne le QR
              ci-dessous avec ton application bancaire, ou effectue un virement avec les coordonnées indiquées.
            </p>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;border:1px solid ${COULEURS.ligne};border-radius:12px;">
              <tr>
                <td style="padding:20px;text-align:center;">
                  <img src="cid:qr-cotisation" alt="QR code SEPA" width="200" height="200" style="display:block;margin:0 auto 16px;" />
                  <p style="margin:0 0 4px;font-size:13px;color:${COULEURS.encreDouce};">${description}</p>
                  <p style="margin:0;font-size:22px;font-weight:700;color:${COULEURS.terracotta};">${montant.toFixed(2)} €</p>
                </td>
              </tr>
            </table>
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:${COULEURS.encreDouce};">
              <tr><td style="padding:3px 0;">Bénéficiaire</td><td style="padding:3px 0;text-align:right;color:${COULEURS.encre};">${nomBeneficiaire}</td></tr>
              <tr><td style="padding:3px 0;">IBAN</td><td style="padding:3px 0;text-align:right;color:${COULEURS.encre};">${iban}</td></tr>
              ${bic ? `<tr><td style="padding:3px 0;">BIC</td><td style="padding:3px 0;text-align:right;color:${COULEURS.encre};">${bic}</td></tr>` : ''}
              <tr><td style="padding:3px 0;">Communication</td><td style="padding:3px 0;text-align:right;color:${COULEURS.encre};">${reference}</td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${COULEURS.ligne};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${COULEURS.encreDouce};">
              Merci pour ta confiance !<br />
              <strong style="color:${COULEURS.pin};">Le comité du Carreau Boules et Pétanque Mondorf</strong>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Remerciement de paiement (29/07/2026, demande Jérôme) — envoyé quand le
 *  CA marque un appel de paiement comme payé (validation depuis
 *  /outils/paiements-en-attente ou directement lors du traitement d'une
 *  demande d'adhésion). */
export function emailMerciPaiement({
  prenom,
  description,
  montant,
}: {
  prenom: string;
  description: string;
  montant: number;
}): string {
  return carteSimple({
    etiquette: 'Paiement reçu',
    titre: `Merci ${prenom} !`,
    paragraphes: [
      `Nous te confirmons la bonne réception de ton paiement pour <strong style="color:${COULEURS.encre};">${description}</strong> (${montant.toFixed(2)} €).`,
      `À bientôt au boulodrome !`,
    ],
  });
}

/** Confirmation de remboursement de frais de concours (module remboursements
 *  v2, 02/08/2026) — envoyée à chaque joueur remboursé. Depuis le forfait
 *  par joueur (migration 0055, 03/08/2026), il n'y a plus de cas "chef
 *  d'équipe qui reçoit pour tout le monde" : d'où la disparition du
 *  paragraphe de redistribution et de emailRemboursementPartenaire(). */
export function emailRemboursementConcours({
  prenom,
  concours,
  montant,
}: {
  prenom: string;
  concours: string;
  montant: number;
}): string {
  return carteSimple({
    etiquette: 'Remboursement concours',
    titre: `Remboursement viré, ${prenom} !`,
    paragraphes: [
      `Le remboursement de tes frais de participation à <strong style="color:${COULEURS.encre};">${concours}</strong> vient d'être validé et viré : <strong style="color:${COULEURS.encre};">${montant.toFixed(2)} €</strong>.`,
      `À bientôt au boulodrome !`,
    ],
  });
}

/** Relance de renouvellement (Phase E du workflow adhésion) — envoyée en
 *  masse aux membres de la saison précédente qui n'ont pas encore
 *  d'adhésion pour la saison cible. Pointe vers /moncaro/renouveler
 *  (Phase B, formulaire de réinscription) plutôt que de recopier quoi que
 *  ce soit automatiquement. */
export function emailRelanceRenouvellement({ prenom, annee }: { prenom: string; annee: string }): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.sable};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:${COULEURS.sableCarte};border-radius:16px;overflow:hidden;border:1px solid ${COULEURS.ligne};">
        <tr>
          <td style="background:${COULEURS.sable};padding:28px 32px;text-align:center;border-bottom:1px solid ${COULEURS.ligne};">
            <img src="cid:logo-club" alt="Carreau Mondorf" width="140" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COULEURS.terracotta};font-weight:600;">Renouvellement ${annee}</p>
            <h1 style="margin:0 0 20px;font-size:26px;line-height:1.3;color:${COULEURS.encre};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;">
              Bonjour ${prenom},
            </h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">
              La saison ${annee} du <strong style="color:${COULEURS.encre};">Carreau Boules et Pétanque Mondorf</strong>
              est ouverte — nous serions ravis de te compter à nouveau parmi nous !
            </p>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">
              Renouvelle ton adhésion en quelques minutes depuis ton espace personnel — tes informations
              sont préremplies, il te suffit de les vérifier et de confirmer.
            </p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
              <tr>
                <td style="border-radius:10px;background:${COULEURS.terracotta};">
                  <a href="https://carreau-mondorf.com/moncaro/renouveler"
                     style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#fff;text-decoration:none;border-radius:10px;">
                    Renouveler mon adhésion
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${COULEURS.ligne};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${COULEURS.encreDouce};">
              À bientôt au boulodrome !<br />
              <strong style="color:${COULEURS.pin};">Le comité du Carreau Boules et Pétanque Mondorf</strong>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Déclaration vocale d'un concours dont l'extraction automatique n'a pas
 *  tout résolu (partenaire non reconnu, club non dit...). Pointe vers un
 *  formulaire dans l'app (/concours/clarifier/[jeton]) plutôt qu'une
 *  réponse en texte libre par e-mail : la réception d'e-mails entrants a
 *  été abandonnée le 03/08/2026 faute d'option gratuite chez Resend (plan
 *  limité à 1 domaine, déjà consommé par l'envoi transactionnel). */
export function emailClarificationConcours({
  prenom,
  resume,
  questions,
  lien,
}: {
  prenom: string;
  /** Ce que le système a compris, pour que le licencié corrige plutôt que resaisir. */
  resume: string;
  questions: string[];
  lien: string;
}): string {
  return carteSimple({
    etiquette: 'Déclaration de concours',
    titre: `Petite précision, ${prenom} ?`,
    paragraphes: [
      `J'ai bien reçu ta déclaration vocale. Voici ce que j'ai compris : <strong style="color:${COULEURS.encre};">${resume}</strong>`,
      `Il me manque encore ${questions.length > 1 ? 'quelques éléments' : 'un élément'} pour lancer le remboursement :`,
      `<ul style="margin:0 0 16px;padding-left:20px;">${questions
        .map((q) => `<li style="margin:0 0 8px;">${q}</li>`)
        .join('')}</ul>`,
      `Complète-les en un clic, ça prend dix secondes.`,
    ],
    cta: { href: lien, texte: 'Compléter ma déclaration' },
  });
}

/** Notification CA — demande d'organisation de manifestation signée
 *  (04/08/2026). Envoyée automatiquement dès que le demandeur a signé son
 *  propre protocole (finaliser_protocole_signe, migration 0057), PDF
 *  signé en pièce jointe — pas besoin d'aller le chercher soi-même dans
 *  Documenso ou l'outil de signature. */
export function emailProtocoleSigne({
  nomPrestation,
  datePrestation,
  responsables,
}: {
  nomPrestation: string;
  datePrestation: string;
  responsables: string;
}): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.sable};padding:32px 16px;">
  <tr>
    <td align="center">
      <table role="presentation" width="100%" style="max-width:480px;background:${COULEURS.sableCarte};border-radius:16px;overflow:hidden;border:1px solid ${COULEURS.ligne};">
        <tr>
          <td style="background:${COULEURS.sable};padding:28px 32px;text-align:center;border-bottom:1px solid ${COULEURS.ligne};">
            <img src="cid:logo-club" alt="Carreau Mondorf" width="140" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COULEURS.terracotta};font-weight:600;">Protocole manifestation signé</p>
            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${COULEURS.encre};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;">
              ${nomPrestation}
            </h1>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">
              <strong style="color:${COULEURS.encre};">${responsables}</strong> vient de signer sa demande d'organisation de manifestation, pour le
              <strong style="color:${COULEURS.encre};">${datePrestation}</strong>.
            </p>
            <p style="margin:0;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">
              Le document signé est joint à cet e-mail.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px;border-top:1px solid ${COULEURS.ligne};">
            <p style="margin:0;font-size:13px;line-height:1.6;color:${COULEURS.encreDouce};">
              <strong style="color:${COULEURS.pin};">Carreau Boules et Pétanque Mondorf — comité</strong>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}
