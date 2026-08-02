-- Résout l'id `personnes` de la session courante — nécessaire pour que le
-- chef d'équipe (un licencié quelconque, pas forcément CA) puisse créer
-- une participation manuelle où `personne_id`/`chef_equipe_id` le
-- désignent lui-même, sans lecture directe de `personnes` (CA-only en
-- lecture, cf. mon_identite()/mon_adhesion() — même principe ici).
create or replace function public.mon_id_personne()
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.personnes
  where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  and supprime = false
  limit 1;
$$;

revoke all on function public.mon_id_personne from public;
grant execute on function public.mon_id_personne to authenticated;
