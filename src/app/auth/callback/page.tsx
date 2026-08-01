import type { Metadata } from 'next';
import { ConfirmerConnexionForm } from '@/components/ConfirmerConnexionForm';

export const metadata: Metadata = { title: 'Connexion' };

/** Flow "implicit" (cf. lib/supabase/client.ts) : les jetons de session
 *  arrivent dans le fragment d'URL (#access_token=...), jamais transmis
 *  au serveur — rien à lire ici côté Server Component, tout se passe côté
 *  client dans ConfirmerConnexionForm. */
export default function AuthCallbackPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-5 py-12">
      <ConfirmerConnexionForm />
    </main>
  );
}
