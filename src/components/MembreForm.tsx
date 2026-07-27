'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { creerMembre, modifierPersonne, enregistrerAdhesion } from '@/lib/actions/membres';
import { marquerDemandeTraitee, creerAccesEtEnvoyerBienvenue } from '@/lib/actions/demandes';
import type { PersonneAvecAdhesion } from '@/lib/types';

const TYPES_ADHESION = ['Licencié', 'Membre (non-licencié)'];

/** Préremplissage en mode création à partir d'une demande d'adhésion
 *  (/membres/demandes) — sous-ensemble des champs de PersonneAvecAdhesion,
 *  sans id/adhesion puisque rien n'existe encore en base à ce stade. */
export type PrefillDemande = {
  nom: string;
  prenom: string;
  sexe: string | null;
  dateNaissance: string;
  nationalite: string | null;
  adresse: string;
  codePostalVille: string;
  telephone: string;
  email: string;
  droitImage: boolean;
  typeAdhesionSouhaite: string | null;
};

/** Formulaire unique pour la création ET l'édition d'une fiche membre —
 *  mêmes champs, seule l'action déclenchée au submit change. Champ
 *  téléphone volontairement en `type="text"` (pas `type="tel"` avec
 *  parsing) : un numéro commençant par "+352" doit être stocké tel quel,
 *  jamais réinterprété (pense-bête Jérôme, 24/07/2026 — le même risque que
 *  Sheets/Excel n'existe pas ici côté stockage, mais autant ne rien laisser
 *  au hasard côté saisie non plus). */
export function MembreForm({
  personne,
  prefill,
  demandeId,
  saisonActuelle,
}: {
  personne?: PersonneAvecAdhesion;
  prefill?: PrefillDemande;
  demandeId?: number;
  saisonActuelle: string;
}) {
  const router = useRouter();
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const modeEdition = !!personne;
  // Sert uniquement de source de valeurs par défaut (édition OU
  // préremplissage depuis une demande) — jamais les deux en même temps.
  const valeurs = personne ?? prefill;

  async function soumettre(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const fd = new FormData(e.currentTarget);

    const donneesPersonne = {
      nom: String(fd.get('nom') || ''),
      prenom: String(fd.get('prenom') || ''),
      sexe: String(fd.get('sexe') || ''),
      dateNaissance: String(fd.get('dateNaissance') || ''),
      nationalite: String(fd.get('nationalite') || ''),
      adresse: String(fd.get('adresse') || ''),
      codePostalVille: String(fd.get('codePostalVille') || ''),
      telephone: String(fd.get('telephone') || ''),
      email: String(fd.get('email') || ''),
      droitImage: fd.get('droitImage') === 'on',
      notes: String(fd.get('notes') || ''),
    };
    const donneesAdhesion = {
      annee: modeEdition ? personne!.adhesion?.annee ?? saisonActuelle : saisonActuelle,
      type: String(fd.get('type') || ''),
      licence: String(fd.get('licence') || ''),
      categorie: String(fd.get('categorie') || ''),
      classe: String(fd.get('classe') || ''),
      cotisationPayee: fd.get('cotisationPayee') === 'on',
    };

    const resultat = modeEdition
      ? await (async () => {
          const r1 = await modifierPersonne(personne!.id, donneesPersonne);
          if (!r1.ok) return r1;
          return enregistrerAdhesion(personne!.id, personne!.adhesion?.id ?? null, donneesAdhesion);
        })()
      : await creerMembre(donneesPersonne, donneesAdhesion);

    setEnCours(false);
    if (!resultat.ok) {
      setErreur(resultat.error);
      return;
    }
    // Traité depuis une demande d'adhésion (/membres/demandes) : la demande
    // n'est classée qu'une fois la fiche membre effectivement créée ou mise
    // à jour — jamais avant, pour ne pas perdre sa trace si ça échoue.
    // En Réinscription (modeEdition true dans ce cas, cf. page.tsx qui
    // résout la personne existante par email), la personne a déjà un accès
    // de connexion : on ne recrée jamais l'accès ni le mail de bienvenue.
    const personneIdTraitee = modeEdition ? personne!.id : 'id' in resultat ? resultat.id : undefined;
    if (demandeId && personneIdTraitee) {
      await marquerDemandeTraitee(demandeId, personneIdTraitee);

      if (!modeEdition && fd.get('creerAcces') === 'on') {
        const resultatAcces = await creerAccesEtEnvoyerBienvenue(
          donneesPersonne.nom,
          donneesPersonne.prenom,
          donneesPersonne.email,
          donneesAdhesion.type === 'Licencié'
        );
        if (!resultatAcces.ok) {
          // La fiche membre existe déjà à ce stade — on affiche
          // l'avertissement et on laisse le CA revenir manuellement,
          // plutôt que de naviguer tout de suite et faire disparaître le
          // message avant qu'il ait pu le lire.
          setAvertissement(resultatAcces.error);
          router.refresh();
          return;
        }
      }
    }
    router.push('/membres');
    router.refresh();
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display text-[15px]">Identité</h3>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="nom"
            required
            defaultValue={valeurs?.nom}
            placeholder="Nom"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <input
            name="prenom"
            required
            defaultValue={valeurs?.prenom}
            placeholder="Prénom"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <select
            name="sexe"
            defaultValue={valeurs?.sexe ?? ''}
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          >
            <option value="">Sexe…</option>
            <option value="F">F</option>
            <option value="M">M</option>
          </select>
          <input
            type="date"
            name="dateNaissance"
            defaultValue={valeurs?.dateNaissance ?? ''}
            aria-label="Date de naissance"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <input
            name="nationalite"
            defaultValue={valeurs?.nationalite ?? ''}
            placeholder="Nationalité"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display text-[15px]">Coordonnées</h3>
        <input
          name="adresse"
          defaultValue={valeurs?.adresse ?? ''}
          placeholder="Adresse"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <input
          name="codePostalVille"
          defaultValue={valeurs?.codePostalVille ?? ''}
          placeholder="Code postal / Ville"
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            inputMode="tel"
            name="telephone"
            defaultValue={valeurs?.telephone ?? ''}
            placeholder="Téléphone (ex. +352 691 123 456)"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <input
            type="email"
            name="email"
            defaultValue={valeurs?.email ?? ''}
            placeholder="Email"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display text-[15px]">Adhésion {modeEdition ? personne!.adhesion?.annee ?? saisonActuelle : saisonActuelle}</h3>
        <div className="grid grid-cols-2 gap-3">
          <select
            name="type"
            required
            defaultValue={personne?.adhesion?.type ?? prefill?.typeAdhesionSouhaite ?? ''}
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          >
            <option value="" disabled>
              Type…
            </option>
            {TYPES_ADHESION.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            name="categorie"
            defaultValue={personne?.adhesion?.categorie ?? ''}
            placeholder="Catégorie"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <input
            name="classe"
            defaultValue={personne?.adhesion?.classe ?? ''}
            placeholder="Classe"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
          <input
            name="licence"
            defaultValue={personne?.adhesion?.licence ?? ''}
            placeholder="N° licence"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-encre-douce">
          <input
            type="checkbox"
            name="cotisationPayee"
            defaultChecked={personne?.adhesion?.cotisationPayee ?? false}
            className="h-4 w-4 accent-terracotta"
          />
          Cotisation payée
        </label>
      </section>

      <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-sable-carte p-5">
        <h3 className="font-display text-[15px]">Autres</h3>
        <label className="flex items-center gap-2 text-[13px] text-encre-douce">
          <input
            type="checkbox"
            name="droitImage"
            defaultChecked={personne?.droitImage ?? prefill?.droitImage ?? false}
            className="h-4 w-4 accent-terracotta"
          />
          Droit à l&apos;image accordé
        </label>
        <textarea
          name="notes"
          defaultValue={personne?.notes ?? ''}
          placeholder="Notes (facultatif — pourquoi, qui, etc.)"
          rows={3}
          className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
        />
      </section>

      {demandeId && !modeEdition && (
        <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-pin/5 p-5">
          <h3 className="font-display text-[15px]">Accès à l&apos;application</h3>
          <label className="flex items-center gap-2 text-[13px] text-encre-douce">
            <input type="checkbox" name="creerAcces" defaultChecked className="h-4 w-4 accent-terracotta" />
            Créer l&apos;accès de connexion et envoyer un email de bienvenue
          </label>
        </section>
      )}

      {erreur && <p className="text-[13px] text-danger">{erreur}</p>}
      {avertissement && (
        <div className="rounded-lg bg-laiton/10 p-3 text-[13px] text-laiton">
          <p>{avertissement}</p>
          <p className="mt-1">La fiche membre a bien été créée.</p>
          <Link href="/membres" className="mt-1 inline-block underline">
            Retour à Membres
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={enCours}
        className="self-start rounded-lg bg-terracotta px-5 py-2.5 text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {enCours ? 'Enregistrement…' : modeEdition ? 'Enregistrer les modifications' : 'Créer le membre'}
      </button>
    </form>
  );
}
