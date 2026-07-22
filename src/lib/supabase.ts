import { createClient } from '@supabase/supabase-js';

// Clé publique (publishable/anon) : sans risque côté serveur ou client, la
// RLS n'autorise de toute façon que la lecture (voir supabase/migrations).
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
