'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Page intermédiaire du lien magique (cf. commentaire ConnexionForm.tsx) :
 *  exige un clic explicite plutôt que d'échanger le code automatiquement
 *  au chargement — un scanner anti-spam qui pré-visite l'URL du lien
 *  (simple GET, pas d'exécution JS) n'atteint que cette page, sans jamais
 *  cliquer, donc sans consommer le jeton PKCE à la place de l'utilisateur
 *  réel. */
export function ConfirmerConnexionForm({ code }: { code: string | null }) {
  const supabase = createClient();
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function confirmer() {
    if (!code) return;
    setEnCours(true);
    setErreur(null);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    setEnCours(false);
    if (error) {
      setErreur('Lien invalide ou expiré — redemande un lien de connexion.');
      return;
    }
    // /moncaro (pas /club) : tableau de bord personnel après connexion,
    // demande explicite de Jérôme le 26/07/2026.
    router.replace('/moncaro');
  }

  if (!code) {
    return (
      <div className="w-full rounded-2xl border border-ligne bg-sable-carte p-7 text-center shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <p className="text-[14px] text-encre">Lien de connexion invalide.</p>
        <p className="mt-1 text-[12.5px] text-encre-douce">Redemande un lien depuis la page de connexion.</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-ligne bg-sable-carte p-7 text-center shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      <p className="text-[14px] text-encre">Clique pour terminer ta connexion.</p>
      {erreur && <p className="mt-2 text-[12.5px] text-danger">{erreur}</p>}
      <button
        type="button"
        onClick={confirmer}
        disabled={enCours}
        className="font-display mt-4 rounded-lg bg-terracotta px-5 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Connexion…' : 'Confirmer la connexion'}
      </button>
    </div>
  );
}
