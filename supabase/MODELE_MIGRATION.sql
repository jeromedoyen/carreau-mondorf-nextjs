-- ============================================================================
-- MODÈLE DE MIGRATION — à COPIER dans supabase/migrations/ sous le prochain
-- numéro (0076_nom.sql, puis 0077…). Ne jamais déposer ce fichier tel quel : il
-- est volontairement hors du dossier des migrations, `npm run db:migrer` ne le joue pas.
-- ============================================================================
--
-- RÈGLE DES DROITS (posée le 21/10/2026, avis de Supabase du 20/10/2026)
-- --------------------------------------------------------------------------
-- Depuis le 30/10/2026, Supabase ne donne plus d'accès automatique à l'API de
-- données (supabase-js, PostgREST, GraphQL) pour les NOUVELLES tables et vues du
-- schéma public. Sans GRANT, l'application reçoit « permission denied » — y
-- compris le code serveur qui utilise la clé secrète (service_role). Chaque table
-- ou vue créée ici porte donc ses droits, dans le MÊME fichier.
-- `npm run db:migrer` refuse la migration sinon (scripts/droits-migrations.js).
--
-- Les trois rôles :
--   service_role   le code serveur en clé secrète (import, sauvegarde, webhooks).
--                  Contourne la RLS mais a quand même besoin du droit sur la table :
--                  presque toujours oui.
--   authenticated  une personne connectée (licencié, CA), avec sa session. Oui si
--                  l'application lit ou écrit la table directement ; la RLS filtre
--                  les lignes (est_membre_ca, est_utilisateur_autorise…).
--   anon           un visiteur NON connecté. Non par défaut. Seulement pour une
--                  table faite pour être lue sans connexion (carte de visite, page
--                  publique). Ex. existant : demandes_adhesion, insertion seule.
--
-- Le GRANT fixe le plafond, la RLS fixe le filtre : n'accorde à authenticated ou
-- anon que les opérations (select, insert, update, delete) que les politiques
-- autorisent réellement. Ne pas compter sur la RLS seule pour rattraper un droit
-- en trop (audit de confidentialité de la migration 0064).
-- ============================================================================

-- 00NN_nom_de_la_migration.sql — Ce que fait la migration, en une ligne
--
-- Pourquoi elle existe, qui l'a demandée et quand, ce qu'on stocke et ce qu'on
-- ne stocke pas (jamais de données de personnes extérieures au club sans raison).

create table public.exemple (
  id          bigint generated always as identity primary key,
  saison      text not null,
  libelle     text not null check (char_length(libelle) between 1 and 120),
  cree_le     timestamptz not null default now()
);

alter table public.exemple enable row level security;

-- Audit des modifications (exigence du 23/07/2026) : qui a fait quoi.
create trigger journal_exemple
after insert or update on public.exemple
for each row execute function public.journaliser_modification();

-- RLS : tout licencié lit, seul le CA écrit.
create policy "lecture licenciés" on public.exemple
  for select using (public.est_utilisateur_autorise());
create policy "CA exemple" on public.exemple
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());

-- DROITS POUR L'API DE DONNÉES — obligatoires, dans cette migration.
grant select, insert, update, delete on public.exemple to service_role;
grant select, insert, update, delete on public.exemple to authenticated;   -- la RLS limite écriture au CA
-- grant select on public.exemple to anon;                                  -- UNIQUEMENT si lisible sans connexion

-- ----------------------------------------------------------------------------
-- CAS PARTICULIERS
-- ----------------------------------------------------------------------------
-- Table écrite uniquement par le serveur (import, webhook Documenso…) : pas de
-- politique d'écriture, et seulement le droit service_role.
--   grant select, insert, update, delete on public.ma_table to service_role;
--
-- Table volontairement NON exposée à l'API (lue seulement par une fonction
-- security definer, par exemple) : aucun grant, mais la déclarer, sinon le contrôle
-- refuse la migration :
--   -- sans-grant: ma_table : lue seulement par la fonction ma_fonction()
--
-- Vue : mêmes droits, et security_invoker pour que la RLS des tables sous-jacentes
-- s'applique (create view, pas create or replace : le contrôle ne voit pas ces dernières).
--   create view public.ma_vue with (security_invoker = true) as select ...;
--   grant select on public.ma_vue to authenticated, service_role;
