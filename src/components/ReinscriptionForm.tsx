'use client';

import { useState, type FormEvent } from 'react';
import { soumettreReinscription } from '@/lib/actions/demandes';
import type { MesInformations } from '@/lib/moncaro';

/** Formulaire de réinscription (Phase B du workflow adhésion) — même
 *  structure que InscriptionForm.tsx, mais préremplie et soumise via
 *  soumettre_reinscription() (session-aware, personne_id résolu côté
 *  serveur) plutôt que soumettreDemandeAdhesion() (anonyme). Redemande à
 *  chaque fois le consentement (règlement, données) même pour un membre
 *  déjà connu — c'est tout l'intérêt de repasser par un vrai formulaire
 *  plutôt qu'une recopie automatique (retour Jérôme, 27/07/2026). */
export function ReinscriptionForm({ prefill, saison }: { prefill: MesInformations | null; saison: string }) {
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoye, setEnvoye] = useState(false);

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const fd = new FormData(e.currentTarget);

    const resultat = await soumettreReinscription({
      nom: String(fd.get('nom') || ''),
      prenom: String(fd.get('prenom') || ''),
      dateNaissance: String(fd.get('dateNaissance') || ''),
      sexe: String(fd.get('sexe') || ''),
      nationalite: String(fd.get('nationalite') || ''),
      adresse: String(fd.get('adresse') || ''),
      codePostalVille: String(fd.get('codePostalVille') || ''),
      telephone: String(fd.get('telephone') || ''),
      email: String(fd.get('email') || ''),
      typeAdhesionSouhaite: String(fd.get('typeAdhesionSouhaite') || ''),
      droitImage: fd.get('droitImage') === 'on',
      message: String(fd.get('message') || ''),
      consentReglement: fd.get('consentReglement') === 'on',
      consentDonnees: fd.get('consentDonnees') === 'on',
    });

    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    setEnvoye(true);
  }

  if (envoye) {
    return (
      <div className="entree rounded-2xl border border-ligne bg-sable-carte p-8 text-center">
        <p className="font-display text-xl italic">Demande de réinscription envoyée</p>
        <p className="mx-auto mt-2 max-w-md text-[13.5px] text-encre-douce">
          Merci ! Le comité va la valider — tu recevras un appel de paiement pour la saison {saison} une fois
          validée.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display text-[15px]">Identité</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="nom"
            required
            defaultValue={prefill?.nom ?? ''}
            placeholder="Nom"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <input
            name="prenom"
            required
            defaultValue={prefill?.prenom ?? ''}
            placeholder="Prénom"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select
            name="sexe"
            defaultValue={prefill?.sexe ?? ''}
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          >
            <option value="">Sexe…</option>
            <option value="F">F</option>
            <option value="M">M</option>
          </select>
          <input
            type="date"
            name="dateNaissance"
            required
            defaultValue={prefill?.dateNaissance ?? ''}
            aria-label="Date de naissance"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <input
            name="nationalite"
            defaultValue={prefill?.nationalite ?? ''}
            placeholder="Nationalité"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display text-[15px]">Coordonnées</h3>
        <input
          name="adresse"
          required
          defaultValue={prefill?.adresse ?? ''}
          placeholder="Adresse"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <input
          name="codePostalVille"
          required
          defaultValue={prefill?.codePostalVille ?? ''}
          placeholder="Code postal / Ville"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="tel"
            name="telephone"
            required
            defaultValue={prefill?.telephone ?? ''}
            placeholder="Téléphone (ex. +352 691 123 456)"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <input
            type="email"
            name="email"
            required
            defaultValue={prefill?.email ?? ''}
            placeholder="Email"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display text-[15px]">Ma réinscription {saison}</h3>
        <select
          name="typeAdhesionSouhaite"
          defaultValue=""
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        >
          <option value="">Type d&apos;adhésion souhaité…</option>
          <option value="Licencié">Licencié (compétition)</option>
          <option value="Membre (non-licencié)">Membre (non-licencié)</option>
        </select>
        <label className="flex items-center gap-2 text-[13px] text-encre-douce">
          <input
            type="checkbox"
            name="droitImage"
            defaultChecked={prefill?.droitImage ?? false}
            className="h-4 w-4 accent-terracotta"
          />
          J&apos;autorise le club à utiliser mon image sur ses supports de communication
        </label>
        <textarea
          name="message"
          placeholder="Message (facultatif)"
          rows={3}
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
      </section>

      <section className="flex flex-col gap-2.5 rounded-2xl border border-ligne bg-sable-carte p-5">
        <label className="flex items-start gap-2.5 text-[13px] text-encre-douce">
          <input type="checkbox" name="consentReglement" required className="mt-0.5 h-4 w-4 accent-terracotta" />
          J&apos;ai pris connaissance du règlement intérieur du club et je m&apos;engage à le respecter.
        </label>
        <label className="flex items-start gap-2.5 text-[13px] text-encre-douce">
          <input type="checkbox" name="consentDonnees" required className="mt-0.5 h-4 w-4 accent-terracotta" />
          J&apos;accepte que mes données personnelles soient traitées par le club dans le cadre de
          la gestion de mon adhésion.
        </label>
      </section>

      {erreur && <p className="text-[13px] text-danger">{erreur}</p>}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-lg bg-terracotta px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Envoi…' : 'Envoyer ma réinscription'}
      </button>
    </form>
  );
}
