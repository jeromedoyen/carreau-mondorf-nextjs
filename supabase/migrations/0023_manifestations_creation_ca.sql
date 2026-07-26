-- Retour Jérôme, 26/07/2026 (test compte fictif) : créer une manifestation
-- est une action d'organisation du club, pas quelque chose qu'un licencié
-- simple doit pouvoir faire — contrairement à l'ajout d'un créneau ou
-- l'inscription comme bénévole (restés ouverts à tout licencié, cf.
-- 0010_ecriture_manifestations.sql, module Bénévole). Resserre uniquement
-- la création/modification de `manifestations`, pas `creneaux`/`affectations`.
drop policy "creation licenciés" on manifestations;
drop policy "modification licenciés" on manifestations;

create policy "creation CA" on manifestations for insert with check (public.est_membre_ca());
create policy "modification CA" on manifestations for update using (public.est_membre_ca()) with check (public.est_membre_ca());
