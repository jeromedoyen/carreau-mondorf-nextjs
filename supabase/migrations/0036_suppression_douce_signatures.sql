-- Suppression (douce) d'une demande de signature depuis l'UI (27/07/2026) —
-- même principe que parties_d2 (0005_ecriture_ca.sql) : jamais de vrai
-- DELETE, une colonne `supprime` que la liste ignore. Le trigger existant
-- (journal_demandes_signature) journalise déjà ce changement comme une
-- "modification" normale (avant/après), donc pas de trigger dédié à créer
-- — c'est exactement la trace demandée par le CA.

alter table demandes_signature add column supprime boolean not null default false;
