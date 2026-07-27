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
                <td style="border-radius:10px;background:${COULEURS.sable};border:1px solid ${COULEURS.terracotta};">
                  <a href="https://carreau-mondorf.com/connexion"
                     style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:${COULEURS.terracotta};text-decoration:none;border-radius:10px;">
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
