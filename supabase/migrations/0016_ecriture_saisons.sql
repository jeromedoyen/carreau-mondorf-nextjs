-- Phase F (2/2) — jusqu'ici la table `saisons` (0008) n'était modifiable
-- que par migration SQL écrite par un développeur : pour l'objectif
-- "opérationnel saison 2027" (cf. CONTEXTE_PROJET.md), le club doit pouvoir
-- créer une nouvelle saison lui-même chaque année, en autonomie.
create policy "creation CA" on saisons for insert with check (est_membre_ca());
create policy "modification CA" on saisons for update using (est_membre_ca()) with check (est_membre_ca());

create trigger journal_saisons
after insert or update on saisons
for each row execute function public.journaliser_modification();

-- Change la saison active de façon atomique — l'index unique partiel
-- "une seule saison active" (0008) interdit d'avoir simultanément l'ancienne
-- ET la nouvelle à `true`, donc l'ordre des deux UPDATE compte : désactiver
-- d'abord, activer ensuite, dans une seule transaction (le corps de
-- fonction Postgres est implicitement transactionnel — deux appels RPC
-- séparés depuis le client ne le garantiraient pas).
create or replace function public.activer_saison(p_id bigint)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.est_membre_ca() then
    raise exception 'Action réservée aux membres du CA.';
  end if;
  update public.saisons set active = false where active = true;
  update public.saisons set active = true where id = p_id;
end;
$$;

revoke all on function public.activer_saison from public;
grant execute on function public.activer_saison to authenticated;
