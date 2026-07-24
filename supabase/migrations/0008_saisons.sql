-- Fondation transversale "saison/année" (Phase 0 de la feuille de route
-- "développement total" décidée le 24/07/2026, cf. CONTEXTE_PROJET.md).
-- Jusqu'ici chaque table (rencontres_d2, division_d2_resultats,
-- promotion_equipes, calendrier_federation) porte sa propre colonne texte
-- `saison` libre ('2025', '2026'...), sans dimension commune. Cette table
-- devient la source de vérité pour la liste des saisons connues et la
-- saison active par défaut à l'affichage — les colonnes `saison` existantes
-- restent des colonnes texte pour l'instant (aucune contrainte FK ajoutée
-- ici : le rattachement propre par clé étrangère est repoussé à la Phase E,
-- au moment où les modules d'écriture CA en auront réellement besoin, pour
-- éviter une migration de données à blanc avant que ce soit utile).
create table saisons (
  id bigint generated always as identity primary key,
  libelle text not null unique, -- ex. '2026', identique aux colonnes saison existantes
  date_debut date not null,
  date_fin date not null,
  active boolean not null default false
);

-- Une seule saison active à la fois.
create unique index saisons_une_seule_active on saisons (active) where active;

alter table saisons enable row level security;
create policy "lecture publique" on saisons for select using (true);

-- Saisons déjà connues via les données importées (rencontres_d2.saison,
-- division_d2_resultats.saison, promotion_equipes.saison — voir 0001_init.sql).
insert into saisons (libelle, date_debut, date_fin, active) values
  ('2025', '2025-01-01', '2025-12-31', false),
  ('2026', '2026-01-01', '2026-12-31', true);
