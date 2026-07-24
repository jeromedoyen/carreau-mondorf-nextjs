-- Phase D — gestion du calendrier fédération par le CA, sans passer par un
-- développeur. Constat v1 : ce calendrier n'a jamais eu de vraie fonction
-- de chargement — seedCalendrierFederation2026() (CalendrierFederation.gs)
-- est un seed unique écrit à la main par Claude à partir d'un PDF fédéral,
-- exécutable uniquement depuis l'éditeur Apps Script. Chaque saison exigeait
-- de redemander à un développeur de retaper le calendrier. Cette migration
-- ajoute une vraie UI CA pour créer/éditer/retirer les événements, saison
-- après saison, en autonomie.
--
-- `supprime` manquait sur cette table (0001_init.sql) car elle était
-- jusqu'ici alimentée uniquement par le script d'import, jamais par l'app —
-- même principe de suppression douce que les autres modules d'écriture.
alter table calendrier_federation add column supprime boolean not null default false;

create policy "creation CA" on calendrier_federation for insert with check (est_membre_ca());
create policy "modification CA" on calendrier_federation for update using (est_membre_ca()) with check (est_membre_ca());
-- Pas de policy delete : suppression douce uniquement (colonne `supprime`).

create trigger journal_calendrier_federation
after insert or update on calendrier_federation
for each row execute function public.journaliser_modification();
