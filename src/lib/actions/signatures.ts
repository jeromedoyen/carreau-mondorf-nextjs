'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { creerEnveloppe } from '@/lib/documenso';
import { televerserVersDrive } from '@/lib/googleDrive';

type Resultat = { ok: true; id?: number } | { ok: false; error: string };

async function verifierCA(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.rpc('est_membre_ca');
  return !!data;
}

/** Appelée juste après l'upload du PDF dans Supabase Storage (fait côté
 *  navigateur, cf. NouvelleDemandeSignatureForm.tsx — un File n'a pas sa
 *  place dans un Server Action ici, autant garder le même client de
 *  session que le reste de la RLS). Cette action ne fait que créer les
 *  lignes en base ; l'envoi effectif aux signataires via DocuSeal est un
 *  geste séparé (envoyerDemandeSignature), même découplage que
 *  creerAppelPaiement()/envoyerAppelPaiementEmail(). */
export async function creerDemandeSignature(data: {
  titre: string;
  cheminStorage: string;
  signataires: { email: string; nom: string }[];
}): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };
  if (!data.titre.trim() || !data.cheminStorage.trim()) {
    return { ok: false, error: 'Titre et document obligatoires.' };
  }
  if (data.signataires.length === 0) {
    return { ok: false, error: 'Au moins un signataire est requis.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const creeParEmail = user?.email ?? 'inconnu';

  const { data: document, error: errDocument } = await supabase
    .from('documents')
    .insert({ titre: data.titre.trim(), chemin_storage: data.cheminStorage, cree_par_email: creeParEmail })
    .select('id')
    .single();
  if (errDocument) return { ok: false, error: errDocument.message };

  const { data: demande, error: errDemande } = await supabase
    .from('demandes_signature')
    .insert({ document_id: document.id, cree_par_email: creeParEmail })
    .select('id')
    .single();
  if (errDemande) return { ok: false, error: errDemande.message };

  const { error: errSignataires } = await supabase.from('demandes_signature_signataires').insert(
    data.signataires.map((s) => ({ demande_id: demande.id, email: s.email, nom: s.nom }))
  );
  if (errSignataires) return { ok: false, error: errSignataires.message };

  revalidatePath('/outils/signatures');
  return { ok: true, id: demande.id };
}

/** Envoie la demande aux signataires via l'API Documenso (instance
 *  auto-hébergée sur Render, 27/07/2026 — contrairement à DocuSeal,
 *  l'édition Community de Documenso inclut bien l'API en self-hosted).
 *  Récupère le PDF depuis Supabase Storage, crée l'"enveloppe" Documenso
 *  avec un champ signature par signataire (empilés en bas de la page 1,
 *  déplaçables par le signataire) — chacun reçoit l'invitation par email
 *  directement depuis Documenso. */
export async function envoyerDemandeSignature(demandeId: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { data: demande, error: errDemande } = await supabase
    .from('demandes_signature')
    .select('id, statut, documents(titre, chemin_storage), demandes_signature_signataires(id, email, nom)')
    .eq('id', demandeId)
    .single();
  if (errDemande || !demande) return { ok: false, error: errDemande?.message ?? 'Demande introuvable.' };
  if (demande.statut !== 'en_attente') return { ok: false, error: 'Cette demande a déjà été envoyée ou traitée.' };

  const document = Array.isArray(demande.documents) ? demande.documents[0] : demande.documents;
  if (!document) return { ok: false, error: 'Document introuvable.' };

  const { data: fichier, error: errTelechargement } = await supabase.storage
    .from('documents-signature')
    .download(document.chemin_storage);
  if (errTelechargement || !fichier) {
    return { ok: false, error: `Impossible de récupérer le PDF : ${errTelechargement?.message}` };
  }

  try {
    const { envelopeId } = await creerEnveloppe({
      titre: document.titre,
      pdfBuffer: Buffer.from(await fichier.arrayBuffer()),
      nomFichier: document.chemin_storage,
      signataires: demande.demandes_signature_signataires,
    });

    const maintenant = new Date().toISOString();
    await supabase
      .from('demandes_signature')
      .update({ statut: 'en_cours', fournisseur_signature_id: envelopeId })
      .eq('id', demandeId);
    await supabase
      .from('demandes_signature_signataires')
      .update({ email_envoye_le: maintenant })
      .eq('demande_id', demandeId);
  } catch (e) {
    return { ok: false, error: `Échec de l'envoi Documenso : ${(e as Error).message}` };
  }

  revalidatePath('/outils/signatures');
  return { ok: true };
}

/** Pointage manuel : un signataire a signé (constaté par le CA en
 *  regardant DocuSeal). Si c'était le dernier signataire restant, la
 *  demande passe automatiquement à "complete". */
export async function marquerSignataireSigne(signataireId: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { data: signataire, error: errSignataire } = await supabase
    .from('demandes_signature_signataires')
    .select('demande_id')
    .eq('id', signataireId)
    .single();
  if (errSignataire || !signataire) return { ok: false, error: errSignataire?.message ?? 'Signataire introuvable.' };

  const maintenant = new Date().toISOString();
  const { error: errMaj } = await supabase
    .from('demandes_signature_signataires')
    .update({ signe_le: maintenant })
    .eq('id', signataireId);
  if (errMaj) return { ok: false, error: errMaj.message };

  const { data: restants } = await supabase
    .from('demandes_signature_signataires')
    .select('id')
    .eq('demande_id', signataire.demande_id)
    .is('signe_le', null);
  if (restants && restants.length === 0) {
    await supabase
      .from('demandes_signature')
      .update({ statut: 'complete', complete_le: maintenant })
      .eq('id', signataire.demande_id);
  }

  revalidatePath('/outils/signatures');
  return { ok: true };
}

/** Enregistre le chemin du PDF signé (uploadé côté navigateur dans le
 *  même bucket, cf. ListeDemandesSignature.tsx) et clôt la demande —
 *  utile si le CA préfère téléverser directement le PDF final récupéré
 *  depuis DocuSeal plutôt que de pointer chaque signataire un par un. */
export async function enregistrerPdfSigne(demandeId: number, cheminStorageSigne: string): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const maintenant = new Date().toISOString();
  const { error } = await supabase
    .from('demandes_signature')
    .update({ statut: 'complete', complete_le: maintenant, chemin_storage_signe: cheminStorageSigne })
    .eq('id', demandeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/signatures');
  return { ok: true };
}

/** Phase 3 (27/07/2026) : pousse le PDF signé vers le Drive du club, via
 *  le compte de service partagé sur un dossier précis (jamais un accès
 *  large au Drive) — nécessite que chemin_storage_signe soit déjà
 *  renseigné (marquerSignataireSigne ou enregistrerPdfSigne). */
export async function archiverDansGoogleDrive(demandeId: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { data: demande, error: errDemande } = await supabase
    .from('demandes_signature')
    .select('id, chemin_storage_signe, documents(titre)')
    .eq('id', demandeId)
    .single();
  if (errDemande || !demande) return { ok: false, error: errDemande?.message ?? 'Demande introuvable.' };
  if (!demande.chemin_storage_signe) {
    return { ok: false, error: "Aucun PDF signé enregistré pour cette demande." };
  }

  const document = Array.isArray(demande.documents) ? demande.documents[0] : demande.documents;

  const { data: fichier, error: errTelechargement } = await supabase.storage
    .from('documents-signature')
    .download(demande.chemin_storage_signe);
  if (errTelechargement || !fichier) {
    return { ok: false, error: `Impossible de récupérer le PDF signé : ${errTelechargement?.message}` };
  }

  try {
    const { fileId } = await televerserVersDrive({
      nomFichier: `${document?.titre ?? 'document'} - signé.pdf`,
      pdfBuffer: Buffer.from(await fichier.arrayBuffer()),
    });
    await supabase.from('demandes_signature').update({ google_drive_file_id: fileId }).eq('id', demandeId);
  } catch (e) {
    return { ok: false, error: `Échec de l'envoi vers Google Drive : ${(e as Error).message}` };
  }

  revalidatePath('/outils/signatures');
  return { ok: true };
}

type ResultatUrl = { ok: true; url: string } | { ok: false; error: string };

/** URL signée temporaire (1h) pour télécharger un PDF du bucket privé
 *  documents-signature — que ce soit l'original ou la version signée. */
export async function obtenirUrlDocument(cheminStorage: string): Promise<ResultatUrl> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { data, error } = await supabase.storage
    .from('documents-signature')
    .createSignedUrl(cheminStorage, 3600);
  if (error || !data) return { ok: false, error: error?.message ?? 'URL introuvable.' };

  return { ok: true, url: data.signedUrl };
}

export async function annulerDemandeSignature(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('demandes_signature').update({ statut: 'annulee' }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/signatures');
  return { ok: true };
}
