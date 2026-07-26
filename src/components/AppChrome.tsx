'use client';

import { usePathname } from 'next/navigation';
import { NavBar } from './NavBar';
import { BottomNav } from './BottomNav';

/** Pages volontairement sans navigation : l'accueil (page d'atterrissage
 *  épurée, 26/07/2026), /club (accessible via le bouton "Simple visite" de
 *  l'accueil — doit rester aussi épuré, sans donner accès au reste de
 *  l'appli tant qu'on ne s'est pas connecté) et /connexion (n'est qu'une
 *  invitation à se connecter, pas la peine d'y montrer un menu qu'on ne
 *  peut pas encore utiliser). Toutes les autres pages gardent la nav
 *  complète, filtrée par rôle (NavLinks.tsx). */
const PAGES_SANS_NAV = ['/', '/club', '/connexion'];

/** Client Component pour lire usePathname sans forcer tout `children`
 *  (Server Component par page) en rendu dynamique — seul ce point de
 *  décision s'hydrate côté client, `children` reste tel que le layout
 *  serveur l'a produit. */
export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const sansNav = PAGES_SANS_NAV.includes(pathname);

  if (sansNav) return <div className="flex min-h-full flex-1 flex-col">{children}</div>;

  return (
    <div className="flex min-h-full flex-1 flex-col pb-[calc(64px+env(safe-area-inset-bottom))] md:pb-0">
      <NavBar />
      {children}
      <BottomNav />
    </div>
  );
}
