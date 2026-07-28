-- Carte d'accueil de l'assistant "Caro" (28/07/2026, demande Jérôme :
-- saluer par le prénom, dans la langue de la nationalité déclarée) —
-- même principe que mon_adhesion() (migration 0026) : `personnes` reste
-- CA-only en lecture directe, cette fonction ne renvoie QUE prénom et
-- nationalité de la session courante, jamais le registre.
create or replace function public.mon_identite()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  email_session text;
  resultat jsonb;
begin
  email_session := lower(coalesce(auth.jwt()->>'email', ''));
  if email_session = '' then
    return null;
  end if;

  select to_jsonb(t) into resultat
  from (
    select p.prenom, p.nationalite
    from public.personnes p
    where lower(p.email) = email_session
      and p.supprime = false
    limit 1
  ) t;

  return resultat;
end;
$$;

revoke all on function public.mon_identite from public;
grant execute on function public.mon_identite to authenticated;
