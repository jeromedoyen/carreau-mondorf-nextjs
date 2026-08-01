'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Lien magique en flow "implicit" (01/08/2026, demande Jérôme via /pb
 *  #98) — cf. commentaire lib/supabase/client.ts pour l'historique complet
 *  (code à 6 chiffres → lien PKCE → lien implicit) et les compromis
 *  assumés. Message volontairement neutre après l'envoi, que l'adresse
 *  soit autorisée ou non — même principe que requestCode() dans l'app
 *  d'origine (Code.gs) : "on ne confirme pas si l'adresse est connue ou
 *  non". */
export function ConnexionForm() {
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyerLien(e: FormEvent) {
    e.preventDefault();
    setErreur(null);

    const adresse = email.trim().toLowerCase();
    if (!adresse.includes('@')) {
      setErreur('Adresse email invalide.');
      return;
    }

    setEnCours(true);
    await supabase.auth.signInWithOtp({
      email: adresse,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setEnCours(false);
    setEnvoye(true);
  }

  if (envoye) {
    return (
      <div className="rounded-2xl border border-ligne bg-sable-carte p-7 text-center shadow-[0_1px_3px_rgba(36,27,18,.04)]">
        <p className="text-[14px] text-encre">
          Si cette adresse est autorisée, un lien de connexion vient de lui être envoyé.
        </p>
        <p className="mt-1 text-[12.5px] text-encre-douce">
          Clique sur le lien depuis n&apos;importe quel appareil — vérifie aussi le dossier
          indésirables/spam.
        </p>
        <button
          type="button"
          onClick={() => {
            setEnvoye(false);
            setEmail('');
            setErreur(null);
          }}
          className="mt-4 text-[12.5px] text-encre-douce underline hover:text-terracotta"
        >
          Utiliser une autre adresse
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-7 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      <form onSubmit={envoyerLien} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[12.5px] text-encre-douce">
            Adresse email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="prenom.nom@exemple.lu"
            className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] text-encre outline-none focus:border-terracotta"
            autoFocus
            required
          />
        </div>
        {erreur && <p className="text-[12.5px] text-danger">{erreur}</p>}
        <button
          type="submit"
          disabled={enCours}
          className="font-display rounded-lg bg-terracotta px-4 py-2.5 text-[14px] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enCours ? 'Envoi…' : 'Recevoir un lien de connexion'}
        </button>
      </form>
    </div>
  );
}
