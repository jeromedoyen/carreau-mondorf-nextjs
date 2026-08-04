'use server';

import { createClient } from '@/lib/supabase/server';
import { creerEnveloppe, obtenirStatutEnveloppe, telechargerDocumentSigne } from '@/lib/documenso';
import { televerserVersDrive } from '@/lib/googleDrive';
import { envoyerEmail, chargerLogoClub } from '@/lib/email';
import { emailProtocoleSigne } from '@/lib/emailTemplates';

type Resultat =
  | { ok: true; urlSignature: string | null; demandeSignatureId: number }
  | { ok: false; error: string };

/** Crée la demande d'organisation (RPC creer_protocole_manifestation,
 *  migration 0056 — auto-vérifie est_utilisateur_autorise() et que le
 *  signataire est bien l'appelant), puis crée et distribue l'enveloppe
 *  Documenso avec le demandeur comme unique signataire. Le PDF est déjà
 *  dans le bucket documents-protocole (upload navigateur, cf.
 *  FormulaireProtocoleManifestation.tsx) avant l'appel à cette action —
 *  même découplage que creerDemandeSignature/envoyerDemandeSignature pour
 *  le module CA. */
export async function creerEtSignerProtocole(data: {
  cheminStorage: string;
  nomPrestation: string;
  datePrestation: string;
  responsables: string;
  deroulement: string;
  animations: string;
  personnesAidantes: string;
}): Promise<Resultat> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false, error: 'Session invalide, reconnecte-toi.' };

  if (!data.nomPrestation.trim() || !data.datePrestation || !data.responsables.trim() || !data.deroulement.trim()) {
    return { ok: false, error: 'Merci de compléter les champs obligatoires.' };
  }

  const { data: demandeId, error: errRpc } = await supabase.rpc('creer_protocole_manifestation', {
    p_chemin_storage: data.cheminStorage,
    p_nom_prestation: data.nomPrestation.trim(),
    p_date_prestation: data.datePrestation,
    p_responsables: data.responsables.trim(),
    p_deroulement: data.deroulement.trim(),
    p_animations: data.animations.trim() || null,
    p_personnes_aidantes: data.personnesAidantes.trim() || null,
  });
  if (errRpc || !demandeId) return { ok: false, error: errRpc?.message ?? 'Échec de la création de la demande.' };

  const { data: fichier, error: errTelechargement } = await supabase.storage
    .from('documents-protocole')
    .download(data.cheminStorage);
  if (errTelechargement || !fichier) {
    return { ok: false, error: `Demande créée mais PDF introuvable : ${errTelechargement?.message}` };
  }

  const { data: profil } = await supabase.from('acces').select('nom').eq('email', user.email).maybeSingle();

  try {
    const { envelopeId, urlsSignature } = await creerEnveloppe({
      titre: data.nomPrestation.trim(),
      pdfBuffer: Buffer.from(await fichier.arrayBuffer()),
      nomFichier: data.cheminStorage,
      signataires: [{ email: user.email, nom: profil?.nom ?? user.email }],
    });

    // RPC security definer (migration 0057) : un update direct via le client
    // de session du membre est silencieusement bloqué par la policy CA-only
    // sur demandes_signature (constaté en pratique — fournisseur_signature_id
    // restait NULL, aucune erreur remontée par Supabase).
    const { error: errMarquage } = await supabase.rpc('marquer_protocole_envoye', {
      p_demande_signature_id: demandeId,
      p_fournisseur_signature_id: envelopeId,
    });
    if (errMarquage) {
      return { ok: false, error: `Enveloppe créée mais échec de l'enregistrement du statut : ${errMarquage.message}` };
    }

    return { ok: true, urlSignature: urlsSignature[user.email] ?? null, demandeSignatureId: demandeId };
  } catch (e) {
    return { ok: false, error: `Demande créée mais échec de l'envoi vers Documenso : ${(e as Error).message}` };
  }
}

type ResultatVerification = { ok: true; signe: boolean } | { ok: false; error: string };

/** Sondage + finalisation (04/08/2026) — appelée depuis l'écran "En attente
 *  de signature" après que le demandeur ait signé dans l'onglet Documenso
 *  et soit revenu sur l'app. Idempotente : finaliser_protocole_signe ne
 *  renvoie des destinataires que la première fois qu'une demande passe à
 *  "complete", donc un double-clic ou un polling répété n'envoie jamais
 *  deux fois l'e-mail au CA. */
export async function verifierEtFinaliserProtocole(demandeSignatureId: number): Promise<ResultatVerification> {
  const supabase = await createClient();

  const { data: demande, error: errDemande } = await supabase
    .from('demandes_signature')
    .select(
      'id, statut, fournisseur_signature_id, documents(titre, chemin_storage), demandes_protocole_manifestation(nom_prestation, date_prestation, responsables)'
    )
    .eq('id', demandeSignatureId)
    .single();
  if (errDemande || !demande) return { ok: false, error: errDemande?.message ?? 'Demande introuvable.' };
  if (demande.statut === 'complete') return { ok: true, signe: true };
  if (!demande.fournisseur_signature_id) return { ok: false, error: 'Enveloppe de signature introuvable.' };

  const statutDocumenso = await obtenirStatutEnveloppe(demande.fournisseur_signature_id);
  const signataire = statutDocumenso?.recipients?.[0];
  if (!signataire?.signedAt) return { ok: true, signe: false };

  const document = Array.isArray(demande.documents) ? demande.documents[0] : demande.documents;
  const protocole = Array.isArray(demande.demandes_protocole_manifestation)
    ? demande.demandes_protocole_manifestation[0]
    : demande.demandes_protocole_manifestation;

  let cheminStorageSigne: string | null = null;
  let googleDriveFileId: string | null = null;
  try {
    const pdfSigne = await telechargerDocumentSigne(demande.fournisseur_signature_id);
    cheminStorageSigne = document?.chemin_storage
      ? `${document.chemin_storage.replace(/\.pdf$/, '')}-signe.pdf`
      : `signe-${demandeSignatureId}-${Date.now()}.pdf`;
    await supabase.storage.from('documents-protocole').upload(cheminStorageSigne, pdfSigne, {
      contentType: 'application/pdf',
      upsert: true,
    });

    const { fileId } = await televerserVersDrive({
      nomFichier: `${document?.titre ?? 'protocole manifestation'} - signé.pdf`,
      pdfBuffer: pdfSigne,
    });
    googleDriveFileId = fileId;

    const { data: destinataires, error: errFinalisation } = await supabase.rpc('finaliser_protocole_signe', {
      p_demande_signature_id: demandeSignatureId,
      p_chemin_storage_signe: cheminStorageSigne,
      p_google_drive_file_id: googleDriveFileId,
    });
    if (errFinalisation) return { ok: false, error: `Signature détectée mais échec de la finalisation : ${errFinalisation.message}` };

    if (destinataires && destinataires.length > 0 && protocole) {
      const html = emailProtocoleSigne({
        nomPrestation: protocole.nom_prestation,
        datePrestation: new Date(protocole.date_prestation + 'T00:00:00').toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
        responsables: protocole.responsables,
      });
      const piecesJointes = [
        { filename: 'logo.png', content: chargerLogoClub(), cid: 'logo-club' },
        { filename: `${protocole.nom_prestation}.pdf`, content: pdfSigne },
      ];
      for (const d of destinataires as { email: string; nom: string }[]) {
        await envoyerEmail({
          destinataire: d.email,
          sujet: `Protocole manifestation signé — ${protocole.nom_prestation}`,
          html,
          attachments: piecesJointes,
        }).catch(() => {
          // Best-effort par destinataire : un échec d'envoi à un membre du CA
          // ne doit pas empêcher les autres de recevoir le document.
        });
      }
    }

    return { ok: true, signe: true };
  } catch (e) {
    return { ok: false, error: `Signature détectée mais échec de l'archivage : ${(e as Error).message}` };
  }
}
