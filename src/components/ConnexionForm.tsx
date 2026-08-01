'use client';

import { useState, type FormEvent } from 'react';
import { createClient } from '@/lib/supabase/client';

/** Lien magique (redevenu la méthode, 01/08/2026, demande Jérôme via /pb
 *  #98 — retour conscient sur la décision du 27/07/2026 documentée
 *  ci-dessous, avec le nouveau SMTP custom en place) :
 *
 *  Historique : le code à 6 chiffres avait remplacé le lien magique à
 *  cause de deux bugs réels — (1) les scanners anti-spam (Yahoo
 *  notamment) pré-visitent l'URL de vérification avant l'ouverture réelle
 *  par l'utilisateur, consommant le jeton PKCE à usage unique ; (2) un
 *  lien ouvert depuis un autre appareil que celui de la demande pose
 *  structurellement problème avec PKCE (le "code verifier" est stocké
 *  dans un cookie du navigateur d'origine).
 *
 *  Mitigation du problème (1) ici : /auth/callback (ConfirmerConnexionForm)
 *  exige un clic explicite sur un bouton avant d'échanger le code — un
 *  scanner qui ne fait qu'un GET automatique sur le lien n'exécute pas ce
 *  clic JS, donc ne consomme plus le jeton à la place de l'utilisateur.
 *  Le problème (2) reste structurel à PKCE (inchangé, acceptable : usage
 *  prévu sur le même appareil que la demande). Message volontairement
 *  neutre après l'envoi, que l'adresse soit autorisée ou non — même
 *  principe que requestCode() dans l'app d'origine (Code.gs) : "on ne
 *  confirme pas si l'adresse est connue ou non". */
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
    const emailRedirectTo = `${window.location.origin}/auth/callback`;
    // TODO(01/08/2026) : diagnostic temporaire — retirer une fois le bug
    // "redirect_to sans /auth/callback" résolu (cf. contexte session).
    console.log('[ConnexionForm] signInWithOtp emailRedirectTo =', emailRedirectTo);
    const resultat = await supabase.auth.signInWithOtp({ email: adresse, options: { emailRedirectTo } });
    console.log('[ConnexionForm] signInWithOtp resultat =', resultat);
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
          Ouvre l&apos;email depuis cet appareil et clique sur le lien — vérifie aussi le dossier
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
