import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Client Server Component/Action — lit la session depuis les cookies de la
 *  requête. Écrit les cookies rafraîchis quand appelé depuis un Server
 *  Action ou Route Handler ; l'écriture échoue silencieusement si appelé
 *  depuis un Server Component pur (attendu, cf. doc @supabase/ssr — le
 *  middleware s'occupe du rafraîchissement dans ce cas). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component — pas d'écriture possible,
            // le middleware (voir middleware.ts) rafraîchit la session.
          }
        },
      },
    }
  );
}
