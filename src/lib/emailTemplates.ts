/** Gabarits d'email HTML — tables + styles inline uniquement (compat
 *  clients mail, pas de flex/grid/CSS externe). Couleurs reprises telles
 *  quelles de la charte graphique v2 (globals.css), logo servi en dur
 *  depuis le domaine de prod (les clients mail ne chargent jamais un
 *  fichier local). */
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
            <img src="https://carreau-mondorf.com/logo.png" alt="Carreau Mondorf" width="140" style="display:block;margin:0 auto;" />
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
            <img src="https://carreau-mondorf.com/logo.png" alt="Carreau Mondorf" width="140" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:${COULEURS.terracotta};font-weight:600;">Appel de paiement</p>
            <h1 style="margin:0 0 20px;font-size:24px;line-height:1.3;color:${COULEURS.encre};font-family:Georgia,'Times New Roman',serif;font-style:italic;font-weight:600;">
              Bonjour ${prenom},
            </h1>
            <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COULEURS.encreDouce};">
              Voici le détail de ta demande de paiement pour le
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
            <img src="https://carreau-mondorf.com/logo.png" alt="Carreau Mondorf" width="140" style="display:block;margin:0 auto;" />
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
