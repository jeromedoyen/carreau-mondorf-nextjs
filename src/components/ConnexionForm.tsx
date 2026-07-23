'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Lien de connexion cliquable (pas de code à 6 chiffres) : la
 *  personnalisation du template email pour y injecter {{ .Token }} exige un
 *  SMTP custom côté Supabase — abandonné après une longue tentative avec
 *  Brevo, cassée par un rejet DMARC systématique de Yahoo sur les adresses
 *  Gmail/Yahoo personnelles comme expéditeur (voir CONTEXTE_PROJET.md).
 *  Le mailer par défaut Supabase, lui, fonctionne — mais sert le template
 *  standard (lien), non personnalisable sans SMTP custom. D'où ce choix.
 *  Message volontairement neutre après l'envoi, que l'adresse soit
 *  autorisée ou non — même principe que requestCode() dans l'app d'origine
 *  (Code.gs) : "on ne confirme pas si l'adresse est connue ou non". Le vrai
 *  rejet se fait côté serveur, via l'Auth Hook "Before user created"
 *  (supabase/migrations/0002_acces.sql). */
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

  return (
    <div className="mx-auto max-w-sm rounded-2xl border border-ligne bg-sable-carte p-7 shadow-[0_1px_3px_rgba(36,27,18,.04)]">
      {envoye ? (
        <div className="flex flex-col gap-3 text-center">
          <p className="text-[14px] text-encre">
            Si cette adresse est autorisée, un lien de connexion vient de lui
            être envoyé.
          </p>
          <p className="text-[12.5px] text-encre-douce">
            Ouvrez votre boîte mail et cliquez sur le lien reçu (pensez à
            vérifier le dossier indésirables/spam).
          </p>
          <button
            type="button"
            onClick={() => {
              setEnvoye(false);
              setEmail('');
              setErreur(null);
            }}
            className="mt-2 text-[12.5px] text-encre-douce underline hover:text-terracotta"
          >
            Utiliser une autre adresse
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
