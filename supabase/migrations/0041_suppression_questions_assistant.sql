-- Suppression (douce) d'une question posée à Caro depuis l'UI (28/07/2026)
-- — même principe que demandes_signature.supprime (0036) : jamais de vrai
-- DELETE, une colonne `supprime` que la liste ignore, journalisée comme
-- une modification normale.

alter table assistant_questions add column supprime boolean not null default false;

create policy "modification CA" on assistant_questions for update
  using (public.est_membre_ca()) with check (public.est_membre_ca());

create trigger journal_assistant_questions
after update on assistant_questions
for each row execute function public.journaliser_modification();
