-- Module "Tournoi" (24/08/2026, demande Jérôme) — généralise l'application
-- autonome écrite le 23/08 pour le tournoi interne du club, et l'intègre
-- comme outil CA (`/outils/tournoi`).
--
-- Ce que ça ajoute par rapport à la version autonome :
--   * paramétrage (nombre d'équipes/joueurs, de parties, de terrains, taille
--     d'équipe, points de la partie) au lieu de constantes en dur ;
--   * deux formats au lieu d'un — voir ci-dessous ;
--   * persistance partagée : l'organisateur saisit, l'état est en base et non
--     dans le localStorage d'un seul navigateur.
--
-- Les deux formats, et pourquoi le modèle est fait ainsi :
--   * `equipes_fixes` — les équipes sont composées au départ et ne changent
--     plus de la journée (système suisse : on apparie par nombre de
--     victoires). C'est le tournoi du 23/08.
--   * `melee` — les équipes sont retirées au sort à CHAQUE partie parmi les
--     joueurs individuels, et le classement est individuel. C'est le format
--     du cochon à la broche du 27/09 ("doublettes ou triplettes à la mêlée").
--
-- D'où `tournoi_equipes.partie_id` : NULL = équipe permanente (format
-- équipes fixes, réutilisée à chaque partie), non NULL = équipe tirée pour
-- cette partie-là (mêlée). Une seule structure sert les deux formats, ce qui
-- évite de dupliquer rencontres/scores/classement par format.
--
-- Accès : CA uniquement (choix explicite de Jérôme, 24/08) — lecture comme
-- écriture. Si un jour on veut exposer le classement aux joueurs, il suffira
-- d'ajouter une policy de lecture, sans toucher au modèle.

-- ---------------------------------------------------------------- tournois
create table tournois (
  id bigint generated always as identity primary key,
  nom text not null,
  date_tournoi date not null,
  format text not null check (format in ('equipes_fixes', 'melee')),
  -- 1 = tête-à-tête, 2 = doublettes, 3 = triplettes
  taille_equipe smallint not null check (taille_equipe between 1 and 3),
  nb_parties smallint not null check (nb_parties between 1 and 12),
  nb_terrains smallint not null check (nb_terrains between 1 and 40),
  points_victoire smallint not null default 13 check (points_victoire between 7 and 21),
  statut text not null default 'preparation'
    check (statut in ('preparation', 'en_cours', 'termine')),
  notes text,
  cree_par_email text not null,
  cree_le timestamptz not null default now(),
  modifie_le timestamptz not null default now()
);
create index tournois_date_idx on tournois (date_tournoi desc);

-- ---------------------------------------------------------- participants
-- `personne_id` NULL = invité non licencié (un conjoint, un joueur d'un club
-- voisin) : on ne veut pas polluer le registre des membres pour un tournoi.
-- L'unicité ne porte donc que sur les licenciés — en Postgres, plusieurs
-- lignes à personne_id NULL restent autorisées par une contrainte unique,
-- ce qui est exactement le comportement voulu ici.
create table tournoi_participants (
  id bigint generated always as identity primary key,
  tournoi_id bigint not null references tournois (id) on delete cascade,
  personne_id bigint references personnes (id) on delete set null,
  nom text not null,
  -- numéro d'équipe de départ (format equipes_fixes uniquement) ; NULL en mêlée
  equipe_depart smallint,
  ordre smallint not null default 0,
  cree_le timestamptz not null default now(),
  unique (tournoi_id, personne_id)
);
create index tournoi_participants_tournoi_idx on tournoi_participants (tournoi_id);

-- --------------------------------------------------------------- parties
create table tournoi_parties (
  id bigint generated always as identity primary key,
  tournoi_id bigint not null references tournois (id) on delete cascade,
  numero smallint not null check (numero >= 1),
  -- équipe au repos quand le nombre d'équipes est impair (créditée d'une
  -- victoire, goal-average neutre — même règle que la version autonome)
  equipe_exempte_id bigint,
  -- vrai si l'algorithme n'a pas pu éviter toutes les revanches à ce tour
  revanche_forcee boolean not null default false,
  cree_le timestamptz not null default now(),
  unique (tournoi_id, numero)
);

-- --------------------------------------------------------------- équipes
create table tournoi_equipes (
  id bigint generated always as identity primary key,
  tournoi_id bigint not null references tournois (id) on delete cascade,
  -- NULL = équipe permanente (equipes_fixes) ; sinon équipe tirée pour cette partie (melee)
  partie_id bigint references tournoi_parties (id) on delete cascade,
  numero smallint not null check (numero >= 1),
  cree_le timestamptz not null default now()
);
create index tournoi_equipes_tournoi_idx on tournoi_equipes (tournoi_id);
create index tournoi_equipes_partie_idx on tournoi_equipes (partie_id);

alter table tournoi_parties
  add constraint tournoi_parties_exempte_fk
  foreign key (equipe_exempte_id) references tournoi_equipes (id) on delete set null;

create table tournoi_equipe_membres (
  id bigint generated always as identity primary key,
  equipe_id bigint not null references tournoi_equipes (id) on delete cascade,
  participant_id bigint not null references tournoi_participants (id) on delete cascade,
  unique (equipe_id, participant_id)
);
create index tournoi_equipe_membres_participant_idx on tournoi_equipe_membres (participant_id);

-- ------------------------------------------------------------ rencontres
-- Les scores restent NULL tant que la rencontre n'est pas jouée. La validité
-- « le vainqueur est à points_victoire » est vérifiée côté application et non
-- ici : le CA doit pouvoir enregistrer un forfait ou une partie arrêtée sans
-- que la base refuse la ligne.
create table tournoi_rencontres (
  id bigint generated always as identity primary key,
  partie_id bigint not null references tournoi_parties (id) on delete cascade,
  terrain smallint not null check (terrain >= 1),
  equipe_a_id bigint not null references tournoi_equipes (id) on delete cascade,
  equipe_b_id bigint not null references tournoi_equipes (id) on delete cascade,
  score_a smallint check (score_a >= 0),
  score_b smallint check (score_b >= 0),
  modifie_le timestamptz not null default now(),
  check (equipe_a_id <> equipe_b_id)
);
create index tournoi_rencontres_partie_idx on tournoi_rencontres (partie_id);

-- ------------------------------------------------------------------- RLS
alter table tournois                enable row level security;
alter table tournoi_participants    enable row level security;
alter table tournoi_parties         enable row level security;
alter table tournoi_equipes         enable row level security;
alter table tournoi_equipe_membres  enable row level security;
alter table tournoi_rencontres      enable row level security;

create policy "CA tournois"               on tournois
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());
create policy "CA tournoi_participants"   on tournoi_participants
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());
create policy "CA tournoi_parties"        on tournoi_parties
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());
create policy "CA tournoi_equipes"        on tournoi_equipes
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());
create policy "CA tournoi_equipe_membres" on tournoi_equipe_membres
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());
create policy "CA tournoi_rencontres"     on tournoi_rencontres
  for all using (public.est_membre_ca()) with check (public.est_membre_ca());

-- ----------------------------------------------------------------- audit
-- Exigence produit du 23/07/2026 : toute écriture doit dire qui a fait quoi.
-- On journalise le tournoi lui-même et les scores — le reste (tirages,
-- compositions) est reconstituable et générerait surtout du bruit.
create trigger journal_tournois
after insert or update on tournois
for each row execute function public.journaliser_modification();

create trigger journal_tournoi_rencontres
after insert or update on tournoi_rencontres
for each row execute function public.journaliser_modification();
