import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/** Client "service role" (SUPABASE_SECRET_KEY) — contourne complètement
 *  la RLS, réservé aux contextes serveur sans session utilisateur
 *  possible : ici, le webhook DocuSeal (POST externe non authentifié côté
 *  Supabase, la confiance vient de la vérification HMAC — voir
 *  verifierSignatureWebhook() dans lib/docuseal.ts — pas d'un JWT de
 *  session). Ne jamais utiliser ce client dans un chemin accessible
 *  depuis le navigateur ou déclenché par une requête utilisateur normale. */
export function createServiceClient() {
  const url = process.env.SUPABASE_URL;
  const cle = process.env.SUPABASE_SECRET_KEY;
  if (!url || !cle) throw new Error('SUPABASE_URL / SUPABASE_SECRET_KEY manquants.');
  return createSupabaseClient(url, cle);
}
