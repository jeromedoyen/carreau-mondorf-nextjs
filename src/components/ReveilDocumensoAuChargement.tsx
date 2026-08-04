'use client';

import { useEffect } from 'react';
import { reveillerDocumenso } from '@/lib/reveillerDocumenso';

/** Composant vide — ne fait que déclencher le réveil Documenso au montage
 *  (cf. reveillerDocumenso.ts). Séparé en composant dédié pour pouvoir
 *  l'insérer dans des Server Components (page.tsx) sans les rendre
 *  eux-mêmes 'use client'. */
export function ReveilDocumensoAuChargement() {
  useEffect(() => {
    reveillerDocumenso();
  }, []);
  return null;
}
