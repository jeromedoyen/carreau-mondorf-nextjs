'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { creerSubmissionPdf } from '@/lib/docuseal';

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

/** Envoie la demande aux signataires via l'API DocuSeal (instance
 *  auto-hébergée sur Render, 27/07/2026) — récupère le PDF depuis
 *  Supabase Storage, l'encode en base64, crée la "submission" DocuSeal
 *  avec un signataire par ligne (chacun reçoit l'email d'invitation
 *  directement de DocuSeal, `send_email: true`). Le format exact de la
 *  réponse DocuSeal n'a pas pu être vérifié contre une vraie instance à
 *  l'écriture de cette action — si le premier envoi échoue avec une
 *  erreur de parsing, c'est probablement là qu'il faut regarder
 *  (creerSubmissionPdf(), src/lib/docuseal.ts). */
export async function envoyerDemandeSignature(demandeId: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  if (!process.env.DOCUSEAL_API_URL || !process.env.DOCUSEAL_API_KEY) {
    return {
      ok: false,
      error: "DocuSeal n'est pas encore configuré (DOCUSEAL_API_URL / DOCUSEAL_API_KEY manquants).",
    };
  }

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
  const pdfBase64 = Buffer.from(await fichier.arrayBuffer()).toString('base64');

  try {
    const { submissionId } = await creerSubmissionPdf({
      titre: document.titre,
      pdfBase64,
      nomFichier: document.chemin_storage,
      submitters: demande.demandes_signature_signataires,
    });

    const maintenant = new Date().toISOString();
    await supabase
      .from('demandes_signature')
      .update({ statut: 'en_cours', docuseal_submission_id: submissionId })
      .eq('id', demandeId);
    await supabase
      .from('demandes_signature_signataires')
      .update({ email_envoye_le: maintenant })
      .eq('demande_id', demandeId);
  } catch (e) {
    return { ok: false, error: `Échec de l'envoi DocuSeal : ${(e as Error).message}` };
  }

  revalidatePath('/outils/signatures');
  return { ok: true };
}

export async function annulerDemandeSignature(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('demandes_signature').update({ statut: 'annulee' }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/signatures');
  return { ok: true };
}
