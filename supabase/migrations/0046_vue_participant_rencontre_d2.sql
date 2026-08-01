-- Retour Jérôme via /pb (01/08/2026) : permettre à un joueur non-CA de
-- consulter (pas modifier) la feuille de match d'une rencontre National D2
-- à laquelle il a participé — pas de vue globale/publique, seulement "les
-- journées qui le concernent personnellement". `parties_d2` reste CA-only
-- en lecture directe (0006_verrouillage_stats.sql) ; comme mes_parties_d2
-- (0022), une fonction security definer ne renvoie les lignes que si le nom
-- de la session apparaît parmi les joueurs_cm de CETTE rencontre précise —
-- jamais le reste. Le CA et la commission sportive (0044) voient toujours
-- tout, comme demandé ("le CA et le comité sportif ont accès à toutes les
-- statistiques").
create or replace function public.parties_rencontre_d2(p_rencontre_id bigint)
returns table (
  phase int,
  type text,
  ordre int,
  joueurs_cm text,
  joueurs_adverse text,
  score_cm int,
  score_adverse int,
  terrain text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  mon_nom text;
  participant boolean;
begin
  if public.est_membre_commission_sportive() then
    return query
    select p.phase, p.type, p.ordre, p.joueurs_cm, p.joueurs_adverse, p.score_cm, p.score_adverse, p.terrain
    from public.parties_d2 p
    where p.rencontre_id = p_rencontre_id and p.supprime = false
    order by p.phase, p.ordre;
    return;
  end if;

  mon_nom := public.mon_nom_benevole();
  if mon_nom is null then
    return;
  end if;

  select exists (
    select 1
    from public.parties_d2 p
    where p.rencontre_id = p_rencontre_id
      and p.supprime = false
      and exists (
        select 1 from unnest(string_to_array(p.joueurs_cm, ',')) as tok
        where upper(public.unaccent(trim(tok))) = upper(public.unaccent(mon_nom))
      )
  ) into participant;

  if not participant then
    return;
  end if;

  return query
  select p.phase, p.type, p.ordre, p.joueurs_cm, p.joueurs_adverse, p.score_cm, p.score_adverse, p.terrain
  from public.parties_d2 p
  where p.rencontre_id = p_rencontre_id and p.supprime = false
  order by p.phase, p.ordre;
end;
$$;

revoke all on function public.parties_rencontre_d2 from public;
grant execute on function public.parties_rencontre_d2 to authenticated;
