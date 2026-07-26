-- Retour Jérôme, 26/07/2026 : un licencié peut s'ajouter à une tâche
-- (affectations, restées ouvertes) mais pas créer un créneau — c'est une
-- action d'organisation, réservée au CA, comme la création de
-- manifestations (0023_manifestations_creation_ca.sql).
drop policy "creation licenciés" on creneaux;
drop policy "modification licenciés" on creneaux;

create policy "creation CA" on creneaux for insert with check (public.est_membre_ca());
create policy "modification CA" on creneaux for update using (public.est_membre_ca()) with check (public.est_membre_ca());
