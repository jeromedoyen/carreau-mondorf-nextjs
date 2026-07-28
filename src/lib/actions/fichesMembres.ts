'use server';

import { createClient } from '@/lib/supabase/server';
import { envoyerEmail, chargerLogoClub } from '@/lib/email';

type Resultat = { ok: true } | { ok: false; error: string };

/** Envoi par email de la fiche PDF d'une seule personne (28/07/2026,
 *  demande Jérôme, enregistrement audio) — le PDF est généré côté
 *  navigateur (même composant que le classeur complet, FichesMembresPdf)
 *  puis transmis ici en base64 pour être joint à l'email ; cette action
 *  ne fait que l'envoi, jamais la génération. */
export async function envoyerFicheMembreParEmail({
  destinataire,
  prenom,
  nom,
  pdfBase64,
}: {
  destinataire: string;
  prenom: string;
  nom: string;
  pdfBase64: string;
}): Promise<Resultat> {
  const supabase = await createClient();
  const { data: ca } = await supabase.rpc('est_membre_ca');
  if (!ca) return { ok: false, error: 'Action réservée au comité.' };

  if (!destinataire.trim()) return { ok: false, error: 'Aucune adresse email pour cette personne.' };

  try {
    await envoyerEmail({
      destinataire,
      sujet: `Ta fiche membre — ${prenom} ${nom}`,
      html: `<!doctype html><html><body style="font-family:sans-serif;color:#241b12;">
        <img src="cid:logo-club" alt="Carreau Mondorf" style="height:48px;" />
        <p>Bonjour ${prenom},</p>
        <p>Voici ta fiche membre, en pièce jointe.</p>
        <p>Le Carreau Boules et Pétanque Mondorf a.s.b.l.</p>
      </body></html>`,
      attachments: [
        { filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' },
        { filename: `Fiche-${nom}-${prenom}.pdf`, content: Buffer.from(pdfBase64, 'base64') },
      ],
    });
  } catch (e) {
    return { ok: false, error: `Échec de l'envoi : ${(e as Error).message}` };
  }

  return { ok: true };
}
