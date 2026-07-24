-- Phase B (gestion des manifestations) — port du modèle de données de
-- carreau-mondorf-app/Code.gs (SHEET_MANIFESTATIONS/SHEET_CRENEAUX/
-- SHEET_AFFECTATIONS, fonctions getManifestations/createCreneau/
-- addAffectation etc.) : Manifestation -> Créneaux -> Affectations
-- (bénévoles), même hiérarchie à 3 niveaux, même soft-delete (`supprime`).
--
-- `saison` (text, même convention que rencontres_d2/calendrier_federation,
-- cf. 0008_saisons.sql) plutôt qu'un recalcul par date à la volée : permet
-- de filtrer par saison exactement comme les autres modules déjà en place.
--
-- Lecture seule dans cette migration (Phase B, premier incrément) : les
-- policies d'écriture (création événement, inscription à un créneau)
-- viendront dans une migration séparée avec l'UI correspondante — même
-- séquencement que 0001_init.sql (lecture) -> 0005_ecriture_ca.sql
-- (écriture) pour le module Compétition.
create table manifestations (
  id bigint generated always as identity primary key,
  saison text not null,
  nom text not null,
  date_debut date not null,
  date_fin date not null,
  lieu text,
  type text,
  statut text not null default 'Planifiée' check (statut in ('Planifiée', 'Confirmée', 'Annulée', 'Terminée')),
  notes text,
  supprime boolean not null default false
);
create index manifestations_saison_idx on manifestations (saison);

create table creneaux (
  id bigint generated always as identity primary key,
  manifestation_id bigint not null references manifestations (id) on delete cascade,
  tache text not null,
  categorie text not null default 'Autre',
  date date not null,
  heure_debut text,
  heure_fin text,
  fin_imprecise boolean not null default false,
  postes_prevus integer not null default 1,
  notes text,
  supprime boolean not null default false
);
create index creneaux_manifestation_idx on creneaux (manifestation_id);

-- `nom` en texte libre (comme parties_d2.joueurs_cm) : le rapprochement de
-- nom (nomCanonique_/isNomMembreConnu_ côté Code.gs) reste une fonctionnalité
-- d'écriture, pas encore portée ici (Phase B écriture, à venir).
create table affectations (
  id bigint generated always as identity primary key,
  creneau_id bigint not null references creneaux (id) on delete cascade,
  nom text not null,
  statut text not null default 'Confirmé',
  est_membre boolean not null default false,
  supprime boolean not null default false
);
create index affectations_creneau_idx on affectations (creneau_id);

alter table manifestations enable row level security;
alter table creneaux enable row level security;
alter table affectations enable row level security;

-- Lecture réservée aux utilisateurs authentifiés connus (même périmètre que
-- requireSession_ côté v1 : "n'importe quel licencié autorisé", pas public)
-- — cohérent avec le verrouillage déjà appliqué aux stats et à Promotion
-- (0006/0007_verrouillage_*.sql).
create policy "lecture licenciés" on manifestations for select using (est_utilisateur_autorise());
create policy "lecture licenciés" on creneaux for select using (est_utilisateur_autorise());
create policy "lecture licenciés" on affectations for select using (est_utilisateur_autorise());
