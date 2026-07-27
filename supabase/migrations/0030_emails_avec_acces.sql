-- Phase E du workflow adhésion (relance de renouvellement en masse,
-- src/lib/actions/renouvellement.ts) : `acces` n'a aucune politique de
-- lecture cliente (0002_acces.sql — seul le Auth Hook Supabase, qui
-- contourne la RLS, la consulte). Pour savoir quels anciens membres ont
-- déjà un accès de connexion (et peuvent donc recevoir un lien vers
-- /moncaro/renouveler), le CA a besoin d'une fonction dédiée plutôt que
-- d'ouvrir la table en lecture — même principe que creer_acces_licencie()
-- (migration 0028) : la portée reste la plus étroite possible.
create or replace function public.emails_avec_acces(p_emails text[])
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_membre_ca() then
    raise exception 'Action réservée au comité.';
  end if;

  return coalesce(
    (
      select array_agg(lower(email))
      from public.acces
      where lower(email) = any (select lower(x) from unnest(p_emails) as x)
    ),
    '{}'
  );
end;
$$;

revoke all on function public.emails_avec_acces from public;
grant execute on function public.emails_avec_acces to authenticated;
