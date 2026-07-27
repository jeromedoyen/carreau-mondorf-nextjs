import { createClient } from './supabase/server';

export type Signataire = {
  id: number;
  email: string;
  nom: string;
  emailEnvoyeLe: string | null;
  signeLe: string | null;
};

export type DemandeSignature = {
  id: number;
  documentId: number;
  titre: string;
  cheminStorage: string;
  cheminStorageSigne: string | null;
  googleDriveFileId: string | null;
  statut: 'en_attente' | 'en_cours' | 'complete' | 'annulee';
  creeParEmail: string;
  creeLe: string;
  completeLe: string | null;
  signataires: Signataire[];
};

/** Liste des membres du CA pouvant être choisis comme signataires — RPC
 *  security definer (signataires_ca(), migration 0033) : `acces` n'a pas
 *  de policy de lecture cliente. */
export async function getSignatairesCA(): Promise<{ email: string; nom: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('signataires_ca');
  if (error) throw error;
  return data ?? [];
}

export async function getDemandesSignature(): Promise<DemandeSignature[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('demandes_signature')
    .select(
      'id, document_id, statut, chemin_storage_signe, google_drive_file_id, cree_par_email, cree_le, complete_le, documents(titre, chemin_storage), demandes_signature_signataires(id, email, nom, email_envoye_le, signe_le)'
    )
    .order('cree_le', { ascending: false });
  if (error) throw error;

  return (data ?? []).map((d) => {
    const document = Array.isArray(d.documents) ? d.documents[0] : d.documents;
    return {
      id: d.id,
      documentId: d.document_id,
      titre: document?.titre ?? '(document supprimé)',
      cheminStorage: document?.chemin_storage ?? '',
      cheminStorageSigne: d.chemin_storage_signe,
      googleDriveFileId: d.google_drive_file_id,
      statut: d.statut,
      creeParEmail: d.cree_par_email,
      creeLe: d.cree_le,
      completeLe: d.complete_le,
      signataires: (d.demandes_signature_signataires ?? []).map((s) => ({
        id: s.id,
        email: s.email,
        nom: s.nom,
        emailEnvoyeLe: s.email_envoye_le,
        signeLe: s.signe_le,
      })),
    };
  });
}
