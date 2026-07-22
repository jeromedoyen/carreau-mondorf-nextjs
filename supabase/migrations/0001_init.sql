-- Schéma initial du module Compétition (National D2 + Promotion), lecture seule.
-- Traduction directe des onglets Google Sheets de l'application Apps Script
-- d'origine (carreau-mondorf-app) — copie ponctuelle, aucun lien avec cette
-- source par la suite. `source_id` conserve l'Id d'origine pour traçabilité
-- au moment de l'import, sans usage applicatif ensuite.

-- Regroupement des statistiques par joueur/trio (pas le registre complet des
-- licenciés — les données personnelles RGPD ne font pas partie de ce module).
create table joueurs (
  id bigint generated always as identity primary key,
  nom_affichage text not null unique
);

-- "Rencontres championnat" — National D2, Carreau Mondorf uniquement.
create table rencontres_d2 (
  id bigint generated always as identity primary key,
  source_id text,
  saison text not null,
  division text not null default 'National D2',
  journee integer not null,
  date date not null,
  domicile boolean,
  club_adverse text,
  lieu text,
  statut text not null check (statut in (
    'Prévue', 'Jouée', 'Reportée', 'Annulée', 'Exempt', 'ForfaitCM', 'ForfaitAdverse'
  )),
  score_cm integer,
  score_adverse integer,
  resultat text check (resultat in ('Victoire', 'Défaite', 'Nul')),
  capitaine_cm text,
  arbitre_delegue text,
  notes text
);
create index rencontres_d2_saison_idx on rencontres_d2 (saison);

-- "Parties championnat" — détail des 20 parties d'une rencontre (règlement
-- FLBP 2025 : 9 Tête à tête (2 pts), 3 Triplette (5 pts), 4 Doublette (3 pts)
-- + 1 Tête à tête du 9e joueur (3 pts, exception à la règle générale),
-- 3 Triplette (5 pts) — 63 points max. Les noms des joueurs sont conservés
-- en texte tel que déjà nettoyés côté source (rapprochement de noms déjà
-- effectué en amont — ce module n'écrit jamais, il n'a pas à le refaire).
create table parties_d2 (
  id bigint generated always as identity primary key,
  source_id text,
  rencontre_id bigint not null references rencontres_d2 (id) on delete cascade,
  phase integer not null check (phase between 1 and 4),
  type text not null check (type in ('Tête à tête', 'Doublette', 'Triplette')),
  ordre integer not null,
  joueurs_cm text not null,
  joueurs_adverse text,
  score_cm integer,
  score_adverse integer,
  terrain text
);
create index parties_d2_rencontre_idx on parties_d2 (rencontre_id);

-- "Résultats division D2" — poule complète (7 clubs), pas seulement Carreau
-- Mondorf. Sert au classement de poule et à son évolution journée par
-- journée. `exempt` = nom canonique du club au repos ce jour-là (club_a/b
-- vides dans ce cas).
create table division_d2_resultats (
  id bigint generated always as identity primary key,
  source_id text,
  saison text not null,
  journee integer not null,
  date date not null,
  club_a text,
  club_b text,
  points_a integer,
  points_b integer,
  exempt text
);
create index division_d2_resultats_saison_idx on division_d2_resultats (saison);

-- "Équipes Promotion" — une ligne = un trio fixe de Carreau Mondorf pour une
-- journée multi-clubs (pas club contre club : 4 parties gagnant/perdant
-- contre des adversaires tirés au sort, sans détail individuel ici).
-- `points` recalculé automatiquement (5 pts par partie gagnée), jamais désaligné.
create table promotion_equipes (
  id bigint generated always as identity primary key,
  source_id text,
  saison text not null,
  journee integer not null,
  date date not null,
  numero_equipe integer not null,
  categorie text,
  type text,
  joueur_1 text,
  joueur_2 text,
  joueur_3 text,
  parties_gagnees integer not null check (parties_gagnees between 0 and 4),
  points integer generated always as (parties_gagnees * 5) stored
);
create index promotion_equipes_saison_idx on promotion_equipes (saison);

-- "Calendrier fédération" — tournois, Promotion, Coupe de Luxembourg,
-- championnats individuels. National D1 et D2 volontairement exclus (D2
-- déjà couvert par rencontres_d2).
create table calendrier_federation (
  id bigint generated always as identity primary key,
  source_id text,
  saison text not null,
  date date not null,
  date_fin date,
  libelle text not null,
  categorie text,
  lieu text,
  domicile boolean,
  concerne_club boolean not null default false,
  notes text
);
create index calendrier_federation_saison_idx on calendrier_federation (saison);

-- Lecture seule et publique pour ce prototype (pas de connexion, pas de
-- donnée personnelle sensible dans ce module) : RLS activée avec une
-- politique de lecture ouverte à tous, aucune écriture autorisée depuis le
-- client (l'import se fait via la clé de service, hors RLS).
alter table joueurs enable row level security;
alter table rencontres_d2 enable row level security;
alter table parties_d2 enable row level security;
alter table division_d2_resultats enable row level security;
alter table promotion_equipes enable row level security;
alter table calendrier_federation enable row level security;

create policy "lecture publique" on joueurs for select using (true);
create policy "lecture publique" on rencontres_d2 for select using (true);
create policy "lecture publique" on parties_d2 for select using (true);
create policy "lecture publique" on division_d2_resultats for select using (true);
create policy "lecture publique" on promotion_equipes for select using (true);
create policy "lecture publique" on calendrier_federation for select using (true);
