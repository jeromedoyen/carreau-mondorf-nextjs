'use client';

import { useState, type FormEvent } from 'react';
import { creerMembre, modifierPersonne, enregistrerAdhesion } from '@/lib/actions/membres';
import { marquerDemandeTraitee, creerAccesEtEnvoyerBienvenue, creerAppelCotisationPourMembre } from '@/lib/actions/demandes';
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
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [cotisationPayee, setCotisationPayee] = useState(personne?.adhesion?.cotisationPayee ?? false);
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
    const modePaiement = String(fd.get('modePaiement') || '');

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
    // Le geste "cotisation + accès/bienvenue" s'applique à toute création
    // d'un nouveau membre — qu'elle vienne d'une demande d'adhésion (y
    // compris Réinscription, modeEdition true dans ce cas, cf. page.tsx qui
    // résout la personne existante par email) OU d'un enregistrement direct
    // au comptoir (!modeEdition, sans demandeId) : jusqu'au 29/07/2026 ce
    // second cas ne déclenchait ni l'appel à cotisation ni l'email de
    // bienvenue, un vrai manque (retour Jérôme) et pas seulement un
    // raccourci pour les demandes. Jamais pour une simple modification
    // d'une fiche existante (modeEdition sans demandeId) — on ne veut pas
    // regénérer un appel de paiement à chaque correction de fiche.
    const personneIdTraitee = modeEdition ? personne!.id : 'id' in resultat ? resultat.id : undefined;
    const declencherPostCreation = (demandeId || !modeEdition) && personneIdTraitee;
    // Les étapes suivantes (cotisation, accès/bienvenue) sont secondaires :
    // la fiche membre (et, s'il y en a une, la demande) sont déjà créées à
    // ce stade. Lancées en arrière-plan SANS attendre leur résultat
    // (29/07/2026, 3e retour Jérôme sur le même symptôme : "je reste sur
    // cette page" alors que les emails étaient bien reçus) — deux emails
    // séquentiels (cotisation avec QR SEPA + bienvenue) peuvent prendre
    // 10-15s, tout ce temps la page semblait figée. La navigation n'a plus
    // aucune raison d'attendre ces envois ; le `try/catch` continue de
    // protéger contre toute exception (ex. QR SEPA sur un IBAN mal formé)
    // qui ne doit jamais remonter jusqu'à l'utilisateur.
    if (declencherPostCreation) {
      (async () => {
        try {
          const resultatCotisation = demandeId
            ? await marquerDemandeTraitee(
                demandeId,
                personneIdTraitee,
                donneesAdhesion.annee,
                `${donneesPersonne.prenom} ${donneesPersonne.nom}`,
                donneesAdhesion.type,
                donneesAdhesion.cotisationPayee,
                modePaiement
              )
            : await creerAppelCotisationPourMembre(
                personneIdTraitee,
                donneesAdhesion.annee,
                `${donneesPersonne.prenom} ${donneesPersonne.nom}`,
                donneesAdhesion.type,
                donneesAdhesion.cotisationPayee,
                modePaiement
              );
          if (!resultatCotisation.ok) console.warn('[MembreForm] cotisation :', resultatCotisation.error);

          if (!modeEdition && fd.get('creerAcces') === 'on') {
            const resultatAcces = await creerAccesEtEnvoyerBienvenue(
              donneesPersonne.nom,
              donneesPersonne.prenom,
              donneesPersonne.email,
              donneesAdhesion.type === 'Licencié'
            );
            if (!resultatAcces.ok) console.warn('[MembreForm] accès/bienvenue :', resultatAcces.error);
          }
        } catch (e) {
          console.warn('[MembreForm] post-création :', (e as Error).message);
        }
      })();
    }
    // Retour au menu standard, immédiat — n'attend plus les envois
    // ci-dessus. `window.location.href` plutôt que router.push()
    // (29/07/2026, 4e retour Jérôme sur le même symptôme malgré plusieurs
    // correctifs successifs côté navigation "douce" Next.js) : un
    // rechargement complet et sans ambiguïté, qui ne peut pas rester
    // silencieusement sans effet quelle qu'en soit la cause exacte côté
    // client (cache du routeur, hydratation, etc.).
    window.location.href = '/';
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
            defaultValue={valeurs?.nationalite ?? (modeEdition ? '' : 'Française')}
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
            required
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
            checked={cotisationPayee}
            onChange={(e) => setCotisationPayee(e.target.checked)}
            className="h-4 w-4 accent-terracotta"
          />
          Cotisation payée
        </label>
        {cotisationPayee ? (
          <input
            name="modePaiement"
            required
            placeholder="Comment ? (espèces, virement, carte…)"
            className="rounded-lg border border-ligne bg-sable px-3 py-2 text-[14px] outline-none focus:border-terracotta"
          />
        ) : (
          (demandeId || !modeEdition) && (
            <p className="text-[11.5px] text-encre-douce/70">
              Pas encore payée : l&apos;appel à cotisation (avec QR code SEPA) partira automatiquement par email à
              la création.
            </p>
          )
        )}
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

      {!modeEdition && (
        <section className="flex flex-col gap-3 rounded-2xl border border-ligne bg-pin/5 p-5">
          <h3 className="font-display text-[15px]">Accès à l&apos;application</h3>
          <label className="flex items-center gap-2 text-[13px] text-encre-douce">
            <input type="checkbox" name="creerAcces" defaultChecked className="h-4 w-4 accent-terracotta" />
            Créer l&apos;accès de connexion et envoyer un email de bienvenue
          </label>
        </section>
      )}

      {erreur && <p className="text-[13px] text-danger">{erreur}</p>}

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
