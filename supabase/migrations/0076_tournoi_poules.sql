-- 0076_tournoi_poules.sql — Troisième format de concours : les poules (30/10/2026)
--
-- Demande de Jérôme, relayée par le comité : pouvoir organiser un concours « à
-- poules » depuis `/outils/tournoi`, comme dans un concours de boules classique.
-- Les équipes sont réparties en poules, chaque poule se joue en tours successifs,
-- puis les qualifiés disputent un tableau à élimination directe, et les éliminés
-- des poules une consolante.
--
-- Choix de conception (réponses de Jérôme du 30/10/2026) :
--   · deux façons de jouer une poule, au choix à la création : « à repêchage »
--     (poule de 4, 2 qualifiés) ou « toutes rondes » ;
--   · phase finale : tableau principal + consolante (la consolante est facultative) ;
--   · le tirage évite de réunir deux équipes du même club dans une poule ;
--   · équipes fixes, constituées avant le concours comme dans le format existant.
--
-- On réutilise le modèle existant plutôt que d'en créer un second :
--   · une « partie » reste un tour joué par tout le monde ; elle porte désormais
--     une phase (poules ou tableaux) et un libellé ;
--   · une rencontre reste une rencontre ; elle sait en plus dans quelle poule ou
--     quel tableau elle se joue, à quel tour, et à quelle place du tableau ;
--   · les équipes permanentes du format « équipes fixes » servent telles quelles.
--
-- Ce qui est nouveau : les poules et leurs équipes, les positions figées des
-- tableaux, et le club de chaque équipe (pour le tirage). Les positions des
-- tableaux sont figées au moment de la qualification : elles dépendent des
-- résultats de poule, qu'une correction de score ne doit pas redistribuer.
--
-- Rien n'est modifié pour les formats existants : toutes les colonnes ajoutées
-- sont facultatives, et la contrainte de cohérence ne s'applique qu'au format
-- « poules ».

-- ----------------------------------------------------------------- tournois
alter table public.tournois drop constraint tournois_format_check;
alter table public.tournois add constraint tournois_format_check
  check (format in ('equipes_fixes', 'melee', 'poules'));

alter table public.tournois
  add column poules_mode text check (poules_mode in ('repechage', 'toutes_rondes')),
  -- taille de poule visée ; les poules sont équilibrées autour d'elle
  add column poules_taille smallint check (poules_taille between 3 and 5),
  -- qualifiés par poule en « toutes rondes » ; toujours 2 à repêchage
  add column poules_qualifies smallint check (poules_qualifies between 1 and 3),
  add column poules_consolante boolean;

alter table public.tournois add constraint tournois_poules_coherent check (
  format <> 'poules'
  or (poules_mode is not null and poules_taille is not null
      and poules_qualifies is not null and poules_consolante is not null)
);

-- ------------------------------------------------------- club d'une équipe
-- Sert au seul tirage des poules : deux équipes du même club ne sont réunies
-- que si c'est inévitable. Vide = club inconnu, aucune contrainte.
alter table public.tournoi_equipes
  add column club text check (club is null or char_length(club) between 1 and 80);

-- ------------------------------------------------------ parties et rencontres
alter table public.tournoi_parties
  add column phase text check (phase in ('poules', 'tableaux')),
  add column libelle text check (libelle is null or char_length(libelle) <= 120);

alter table public.tournoi_rencontres
  add column tableau text check (tableau in ('principal', 'consolante')),
  -- tour de poule (1..) ou tour du tableau (1 = premier tour)
  add column tour smallint check (tour >= 1),
  -- position de la rencontre dans le tour du tableau (1..)
  add column place smallint check (place >= 1);

-- ----------------------------------------------------------------- les poules
create table public.tournoi_poules (
  id bigint generated always as identity primary key,
  tournoi_id bigint not null references public.tournois (id) on delete cascade,
  numero smallint not null check (numero between 1 and 26),
  cree_le timestamptz not null default now(),
  unique (tournoi_id, numero)
);
create index tournoi_poules_tournoi_idx on public.tournoi_poules (tournoi_id);

create table public.tournoi_poule_equipes (
  id bigint generated always as identity primary key,
  poule_id bigint not null references public.tournoi_poules (id) on delete cascade,
  equipe_id bigint not null references public.tournoi_equipes (id) on delete cascade,
  -- rang dans le tirage : sert de dernier départage d'une égalité parfaite
  ordre smallint not null check (ordre >= 1),
  unique (equipe_id),
  unique (poule_id, ordre)
);
create index tournoi_poule_equipes_poule_idx on public.tournoi_poule_equipes (poule_id);

alter table public.tournoi_rencontres
  add column poule_id bigint references public.tournoi_poules (id) on delete cascade;

-- Une rencontre appartient à une poule OU à un tableau, jamais aux deux.
alter table public.tournoi_rencontres add constraint tournoi_rencontres_poule_ou_tableau
  check (poule_id is null or tableau is null);

-- ------------------------------------------------- positions des tableaux
-- `equipe_id` vide = case d'exempt : l'adversaire passe directement au tour
-- suivant. Supprimées avec la partie qui les a créées (annuler cette partie
-- défait la qualification), jamais séparément.
create table public.tournoi_tableau_places (
  id bigint generated always as identity primary key,
  tournoi_id bigint not null references public.tournois (id) on delete cascade,
  partie_id bigint not null references public.tournoi_parties (id) on delete cascade,
  tableau text not null check (tableau in ('principal', 'consolante')),
  position smallint not null check (position >= 1),
  equipe_id bigint references public.tournoi_equipes (id) on delete cascade,
  unique (tournoi_id, tableau, position)
);
create index tournoi_tableau_places_tournoi_idx on public.tournoi_tableau_places (tournoi_id);

-- ---------------------------------------------------------------------- RLS
alter table public.tournoi_poules          enable row level security;
alter table public.tournoi_poule_equipes   enable row level security;
alter table public.tournoi_tableau_places  enable row level security;

create policy "CA tournoi_poules"          on public.tournoi_poules
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());
create policy "CA tournoi_poule_equipes"   on public.tournoi_poule_equipes
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());
create policy "CA tournoi_tableau_places"  on public.tournoi_tableau_places
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());

-- Audit : les scores et le tournoi sont déjà journalisés (0059). Les poules et
-- les positions se reconstituent à partir d'eux et de la partie : pas de journal.

-- --------------------------------------------- DROITS POUR L'API DE DONNÉES
-- Module réservé au CA : la RLS ci-dessus filtre, le grant fixe le plafond.
grant select, insert, update, delete on public.tournoi_poules          to service_role;
grant select, insert, update, delete on public.tournoi_poules          to authenticated;
grant select, insert, update, delete on public.tournoi_poule_equipes   to service_role;
grant select, insert, update, delete on public.tournoi_poule_equipes   to authenticated;
grant select, insert, update, delete on public.tournoi_tableau_places  to service_role;
grant select, insert, update, delete on public.tournoi_tableau_places  to authenticated;

-- Les droits par défaut de la base accordent aussi tout à `anon` (visiteur non
-- connecté). La RLS lui interdit déjà toute ligne, mais TRUNCATE ne passe pas par
-- la RLS : on retire le droit à la source, comme l'audit de 0064 l'a fait pour
-- les fonctions. Le module est réservé au CA, `anon` n'y a aucune raison d'accès.
revoke all on public.tournoi_poules          from anon;
revoke all on public.tournoi_poule_equipes   from anon;
revoke all on public.tournoi_tableau_places  from anon;

