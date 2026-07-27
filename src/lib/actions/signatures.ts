'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

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

/** Envoie la demande aux signataires via l'API DocuSeal — nécessite
 *  DOCUSEAL_API_URL et DOCUSEAL_API_KEY (instance auto-hébergée, jamais
 *  configurée dans ce commit : le format exact de l'appel n'a pas pu être
 *  vérifié contre une instance réelle). À finaliser une fois l'instance
 *  DocuSeal déployée par Jérôme (Railway ou équivalent) — voir
 *  CONTEXTE_PROJET.md. */
export async function envoyerDemandeSignature(_demandeId: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  if (!process.env.DOCUSEAL_API_URL || !process.env.DOCUSEAL_API_KEY) {
    return {
      ok: false,
      error: "DocuSeal n'est pas encore configuré (DOCUSEAL_API_URL / DOCUSEAL_API_KEY manquants).",
    };
  }

  return { ok: false, error: 'Envoi DocuSeal pas encore implémenté — à faire une fois l’instance déployée.' };
}

export async function annulerDemandeSignature(id: number): Promise<Resultat> {
  const supabase = await createClient();
  if (!(await verifierCA(supabase))) return { ok: false, error: 'Action réservée au comité.' };

  const { error } = await supabase.from('demandes_signature').update({ statut: 'annulee' }).eq('id', id);
  if (error) return { ok: false, error: error.message };

  revalidatePath('/outils/signatures');
  return { ok: true };
}
