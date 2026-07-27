-- Retour Jérôme, 26/07/2026 : un licencié peut s'ajouter à une tâche
-- (affectations, restées ouvertes) mais pas créer un créneau — c'est une
-- action d'organisation, réservée au CA, comme la création de
-- manifestations (0023_manifestations_creation_ca.sql).
-- "if exists" : tolérant à un nom de policy déjà différent en base
-- (0010_ecriture_manifestations.sql n'a peut-être pas été appliquée à
-- l'identique, ou déjà retouchée) — évite de bloquer sur un nom de policy
-- introuvable plutôt que sur le fond (créer la bonne policy CA).
drop policy if exists "creation licenciés" on creneaux;
drop policy if exists "modification licenciés" on creneaux;
drop policy if exists "creation CA" on creneaux;
drop policy if exists "modification CA" on creneaux;

create policy "creation CA" on creneaux for insert with check (public.est_membre_ca());
create policy "modification CA" on creneaux for update using (public.est_membre_ca()) with check (public.est_membre_ca());
