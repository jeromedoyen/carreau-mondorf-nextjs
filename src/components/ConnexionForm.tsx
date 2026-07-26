'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Code à 6 chiffres saisi manuellement plutôt qu'un lien cliquable — le
 *  lien avait deux défauts en pratique (v. CONTEXTE_PROJET.md) : (1) les
 *  scanners anti-spam (Yahoo notamment) pré-visitent l'URL de vérification
 *  Supabase avant l'ouverture réelle par l'utilisateur, consommant le
 *  jeton à usage unique ; (2) un lien ouvert depuis un autre appareil que
 *  celui de la demande posait déjà problème avec le flux PKCE. Le code
 *  saisi à la main échappe aux deux : rien à pré-visiter, et
 *  verifyOtp() ne dépend d'aucun cookie posé au moment de la demande.
 *  Nécessite un template email Supabase personnalisé (SMTP custom Resend)
 *  affichant {{ .Token }} au lieu du lien par défaut.
 *  Message volontairement neutre après l'envoi, que l'adresse soit
 *  autorisée ou non — même principe que requestCode() dans l'app d'origine
 *  (Code.gs) : "on ne confirme pas si l'adresse est connue ou non". Le vrai
 *  rejet se fait côté serveur, via l'Auth Hook "Before user created"
 *  (supabase/migrations/0002_acces.sql) — dans ce cas, verifyOtp() échoue
 *  simplement avec "code invalide", indiscernable d'un mauvais code. */
export function ConnexionForm() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [envoye, setEnvoye] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function envoyerCode(e: FormEvent) {
    e.preventDefault();
    setErreur(null);

    const adresse = email.trim().toLowerCase();
    if (!adresse.includes('@')) {
      setErreur('Adresse email invalide.');
      return;
    }

    setEnCours(true);
    await supabase.auth.signInWithOtp({ email: adresse });
    setEnCours(false);
    setEnvoye(true);
  }

  async function validerCode(e: FormEvent) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code.trim(),
      type: 'email',
    });
    setEnCours(false);
    if (error) {
      setErreur('Code invalide ou expiré. Vérifiez le code reçu par email, ou redemandez-en un.');
      return;
    }
    router.replace('/');
  }

  return (
    <div className="rounded-2xl border border-ligne bg-sable-carte p-7 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      {envoye ? (
        <form onSubmit={validerCode} className="flex flex-col gap-4">
          <div className="text-center">
            <p className="text-[14px] text-encre">
              Si cette adresse est autorisée, un code à 6 chiffres vient de
              lui être envoyé.
            </p>
            <p className="mt-1 text-[12.5px] text-encre-douce">
              Vérifiez aussi le dossier indésirables/spam.
            </p>
          </div>
          <div>
            <label htmlFor="code" className="mb-1.5 block text-[12.5px] text-encre-douce">
              Code reçu par email
            </label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="12345678"
              maxLength={12}
              className="w-full rounded-lg border border-ligne bg-sable px-3 py-2 text-center text-[18px] tracking-[0.3em] text-encre outline-none focus:border-terracotta"
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
            {enCours ? 'Vérification…' : 'Se connecter'}
          </button>
          <button
            type="button"
            onClick={() => {
              setEnvoye(false);
              setEmail('');
              setCode('');
              setErreur(null);
            }}
            className="text-[12.5px] text-encre-douce underline hover:text-terracotta"
          >
            Utiliser une autre adresse
          </button>
        </form>
      ) : (
        <form onSubmit={envoyerCode} className="flex flex-col gap-4">
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
            {enCours ? 'Envoi…' : 'Recevoir un code de connexion'}
          </button>
        </form>
      )}
    </div>
  );
}
