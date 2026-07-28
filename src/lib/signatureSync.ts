import type { SupabaseClient } from '@supabase/supabase-js';

export type RecipientDocumenso = {
  email?: string;
  signingStatus?: string;
  status?: string;
  signedAt?: string | null;
};

export function estSigneDocumenso(r: RecipientDocumenso): boolean {
  return r.signingStatus === 'SIGNED' || r.status === 'SIGNED' || !!r.signedAt;
}

/** Applique l'état des destinataires rapporté par Documenso (webhook ou
 *  interrogation directe de l'API, cf. obtenirStatutEnveloppe) à une
 *  demande de signature : marque `signe_le` pour chaque signataire signé
 *  pas encore enregistré comme tel, puis passe la demande à "complete" si
 *  plus aucun signataire ne manque. Partagé entre le webhook
 *  (/api/webhooks/documenso, client service-role) et la synchronisation
 *  par sondage (getDemandesSignature, client de session CA) — même règle
 *  des deux côtés, pas de duplication. */
export async function appliquerRecipientsDocumenso(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  demandeId: number,
  recipients: RecipientDocumenso[]
): Promise<{ complete: boolean }> {
  for (const r of recipients) {
    if (!r.email || !estSigneDocumenso(r)) continue;
    await supabase
      .from('demandes_signature_signataires')
      .update({ signe_le: r.signedAt ?? new Date().toISOString() })
      .eq('demande_id', demandeId)
      .eq('email', r.email)
      .is('signe_le', null);
  }

  const { data: restants } = await supabase
    .from('demandes_signature_signataires')
    .select('id')
    .eq('demande_id', demandeId)
    .is('signe_le', null);

  const complete = !!restants && restants.length === 0;
  if (complete) {
    await supabase
      .from('demandes_signature')
      .update({ statut: 'complete', complete_le: new Date().toISOString() })
      .eq('id', demandeId);
  }

  return { complete };
}
