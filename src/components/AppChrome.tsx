'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { NavBar } from './NavBar';
import { BottomNav } from './BottomNav';
import { AssistantChat } from './AssistantChat';
import { createClient } from '@/lib/supabase/client';

/** "/" et "/club" masquent le menu pour un visiteur non connecté (accueil
 *  épuré, "Simple visite") — mais dès qu'on est connecté, le menu doit
 *  réapparaître partout, y compris là (26/07/2026 : bug signalé — un
 *  utilisateur qui se connectait retombait sur une page sans menu, la
 *  redirection post-connexion pointant vers "/"). "/connexion" reste
 *  toujours sans menu (ce n'est qu'une invitation à se connecter). */
const PAGES_SANS_NAV_SI_ANONYME = ['/', '/club'];
const PAGES_TOUJOURS_SANS_NAV = ['/connexion'];

/** Client Component pour lire usePathname/session sans forcer tout
 *  `children` (Server Component par page) en rendu dynamique — seul ce
 *  point de décision s'hydrate côté client, `children` reste tel que le
 *  layout serveur l'a produit. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [connecte, setConnecte] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => setConnecte(!!data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setConnecte(!!session));
    return () => subscription.unsubscribe();
  }, []);

  const sansNav =
    PAGES_TOUJOURS_SANS_NAV.includes(pathname) ||
    (PAGES_SANS_NAV_SI_ANONYME.includes(pathname) && connecte !== true);

  if (sansNav) return <div className="flex min-h-full flex-1 flex-col">{children}</div>;

  return (
    <div className="flex min-h-full flex-1 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
      <NavBar />
      {children}
      {connecte === true && <AssistantChat />}
      <BottomNav />
    </div>
  );
}
