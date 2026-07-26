-- Ajoute source_id aux tables créées après le premier import CSV
-- (0009_manifestations.sql, 0011_conges.sql) — même pattern que
-- rencontres_d2/personnes/adhesions (0001_init.sql, 0004_registre_membres.sql) :
-- conserve l'Id d'origine du Sheet pour la résolution des clés étrangères
-- lors de l'import (scripts/import-csv.ts), sans usage applicatif au-delà.
alter table manifestations add column source_id text;
alter table creneaux add column source_id text;
alter table affectations add column source_id text;
alter table conges add column source_id text;
