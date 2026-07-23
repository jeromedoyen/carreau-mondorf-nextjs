-- Registre membres/licenciés (Phase 4) — port du schéma "Personnes" /
-- "Adhésions" de l'app d'origine (Code.gs : PERSONNES_HEADERS /
-- ADHESIONS_HEADERS, cf. migrateToPersonnesAdhesions). Deux tables
-- normalisées (une personne peut avoir plusieurs adhésions, une par année).
--
-- ⚠️ RGPD : contrairement aux autres tables de ce schéma (résultats
-- sportifs, calendrier — publics par nature), ces deux tables contiennent
-- des données personnelles réelles de membres du club (date de naissance,
-- adresse, téléphone...). Schéma + droits d'accès créés ici ; l'IMPORT des
-- données réelles est une étape volontairement séparée, à ne lancer
-- qu'après confirmation explicite (cf. CONTEXTE_PROJET.md).
create table personnes (
  id bigint generated always as identity primary key,
  source_id text,
  nom text not null,
  prenom text not null,
  sexe text,
  date_naissance date,
  nationalite text,
  adresse text,
  code_postal_ville text, -- colonne combinée côté source ("Code postal / Ville"), pas séparée
  telephone text,
  email text,
  droit_image boolean,
  supprime boolean not null default false
);
create index personnes_nom_idx on personnes (nom, prenom);

create table adhesions (
  id bigint generated always as identity primary key,
  source_id text,
  personne_id bigint not null references personnes (id) on delete cascade,
  annee text not null,
  type text not null, -- 'Licencié' | 'Membre (non-licencié)' (cf. joinPersonnesAdhesions_)
  licence text,
  categorie text,
  classe text,
  cotisation_payee boolean,
  cotisation_date date,
  cotisation_montant numeric,
  cotisation_mode text,
  licence_payee boolean,
  licence_date date,
  licence_montant numeric,
  supprime boolean not null default false
);
create index adhesions_personne_idx on adhesions (personne_id);
create index adhesions_annee_idx on adhesions (annee);

-- Lecture réservée aux membres du CA (est_membre_ca(), cf. 0003_role_ca.sql)
-- — équivalent RGPD-conscient de requireSession_() côté app d'origine, en
-- plus strict : là-bas *tout* licencié connecté pouvait lire le registre
-- complet (gap connu, jamais corrigé — cf. section Authentification de
-- carreau-mondorf-app/CONTEXTE_PROJET.md). Ici, direct au niveau CA.
alter table personnes enable row level security;
alter table adhesions enable row level security;

create policy "lecture CA uniquement" on personnes for select using (public.est_membre_ca());
create policy "lecture CA uniquement" on adhesions for select using (public.est_membre_ca());

-- Aucune policy d'écriture : import via clé de service uniquement pour
-- l'instant (comme les autres tables) — les actions CA en écriture
-- (Phase 5) viendront avec leurs propres policies + le journal de
-- modifications requis (cf. CLAUDE.md, section "Exigence produit : audit
-- des modifications").

-- 🚧 PAS ENCORE FAIT (à ajouter une fois des données réelles importées) :
-- est_licencie() / est_membre() — les vraies fonctions basées sur
-- adhesions.type ('Licencié' vs 'Membre (non-licencié)'), distinctes de
-- est_utilisateur_autorise() (0003_role_ca.sql, qui ne fait que vérifier le
-- droit de connexion, pas le statut réel du membre). Nécessite de faire le
-- lien acces.email -> personnes.email -> adhesions — à concevoir avec soin
-- (les emails ne correspondent pas forcément à 100% entre les deux listes).
-- Exemple de forme attendue une fois les données là :
--
-- create function public.est_licencie() returns boolean ... as $$
--   select exists (
--     select 1 from public.adhesions a
--     join public.personnes p on p.id = a.personne_id
--     where lower(p.email) = lower(coalesce(auth.jwt()->>'email', ''))
--     and a.type = 'Licencié' and a.annee = <année en cours> and a.supprime = false
--   );
-- $$;
-- (et une variante est_membre() sans le filtre sur `type`, pour "n'importe
-- quel type d'adhésion cette année").
