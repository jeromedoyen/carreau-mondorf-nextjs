import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/** Point d'arrivée du lien de connexion cliqué depuis l'email (voir
 *  ConnexionForm.tsx — emailRedirectTo pointe ici). Supabase redirige vers
 *  cette route avec un ?code= (flux PKCE, cf. @supabase/ssr) après
 *  vérification du lien ; on échange ce code contre une session, qui pose
 *  le cookie via le client serveur, puis on renvoie l'utilisateur à
 *  l'accueil. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/connexion?erreur=lien_invalide`);
}
