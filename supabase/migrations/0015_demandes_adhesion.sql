-- Phase E (2/2) — port du formulaire d'inscription/réinscription public de
-- carreau-mondorf-app (Code.gs : SHEET_INSCRIPTIONS, submitInscription(),
-- getDemandes(), validateDemande(), rejectDemande()). Simplifié par rapport
-- à v1 : pas de "nettoyage" automatique des champs (title-case, adresse...)
-- ni de recherche de réinscription automatique par nom+date de naissance —
-- le CA voit et corrige les champs directement dans le formulaire de
-- création (MembreForm, déjà construit) au moment de traiter la demande,
-- plutôt qu'un écran de prévisualisation séparé. Un seul rôle : recevoir la
-- demande brute et laisser le CA décider, pas deviner à sa place.
--
-- Table publique en ÉCRITURE (n'importe qui doit pouvoir soumettre une
-- demande sans connexion, comme le formulaire v1) mais jamais en LECTURE
-- (seul le CA voit les demandes soumises) — RLS asymétrique, première fois
-- dans ce schéma que `anon` a un droit d'écriture direct.
create table demandes_adhesion (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  type_demande text not null check (type_demande in ('Inscription', 'Réinscription')),
  nom text not null,
  prenom text not null,
  date_naissance date not null,
  sexe text,
  nationalite text,
  adresse text not null,
  code_postal_ville text not null,
  telephone text not null,
  email text not null,
  type_adhesion_souhaite text,
  droit_image boolean not null default false,
  message text,
  consent_reglement boolean not null,
  consent_donnees boolean not null,
  statut text not null default 'a_traiter' check (statut in ('a_traiter', 'validee', 'rejetee')),
  personne_id bigint references personnes (id) -- rempli à la validation, traçabilité
);
create index demandes_adhesion_statut_idx on demandes_adhesion (statut);

alter table demandes_adhesion enable row level security;

-- Écriture publique (soumission du formulaire), aucune lecture ni
-- modification par ce même rôle anonyme — une fois envoyée, une demande
-- n'est plus consultable/modifiable que par le CA.
grant insert on demandes_adhesion to anon;
create policy "soumission publique" on demandes_adhesion for insert to anon with check (true);

create policy "lecture CA uniquement" on demandes_adhesion for select using (est_membre_ca());
create policy "traitement CA uniquement" on demandes_adhesion for update using (est_membre_ca()) with check (est_membre_ca());

-- Trigger d'audit sur UPDATE seulement (pas INSERT — la soumission initiale
-- vient d'un visiteur anonyme sans email de session à journaliser ; ce qui
-- compte pour l'audit, c'est la décision du CA — valider/refuser).
create trigger journal_demandes_adhesion
after update on demandes_adhesion
for each row execute function public.journaliser_modification();
