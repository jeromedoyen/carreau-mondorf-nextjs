'use client';

/** Fire-and-forget côté client — cf. api/reveil/documenso/route.ts pour le
 *  pourquoi. `keepalive` pour que la requête survive même si l'utilisateur
 *  navigue ailleurs immédiatement après. */
export function reveillerDocumenso() {
  fetch('/api/reveil/documenso', { keepalive: true }).catch(() => {});
}
