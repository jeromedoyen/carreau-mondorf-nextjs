'use server';

import { createClient } from '@/lib/supabase/server';
import { creerEnveloppe } from '@/lib/documenso';

type Resultat = { ok: true; urlSignature: string | null } | { ok: false; error: string };

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

    const maintenant = new Date().toISOString();
    await supabase
      .from('demandes_signature')
      .update({ statut: 'en_cours', fournisseur_signature_id: envelopeId })
      .eq('id', demandeId);
    await supabase
      .from('demandes_signature_signataires')
      .update({ email_envoye_le: maintenant })
      .eq('demande_id', demandeId);

    return { ok: true, urlSignature: urlsSignature[user.email] ?? null };
  } catch (e) {
    return { ok: false, error: `Demande créée mais échec de l'envoi vers Documenso : ${(e as Error).message}` };
  }
}
