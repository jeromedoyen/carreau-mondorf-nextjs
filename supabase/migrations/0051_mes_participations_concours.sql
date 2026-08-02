-- Vue personnelle des participations concours (module remboursements v2)
-- pour un licencié non-trésorerie : la RLS de participations_concours
-- limite déjà les lignes visibles (les siennes + celles où il est chef),
-- mais le nom des coéquipiers vient d'une jointure sur `personnes`
-- (CA-only en lecture) qui échouerait silencieusement pour ce rôle. Même
-- principe que mes_parties_d2()/mon_identite() : la fonction résout les
-- noms en interne (security definer) et ne renvoie que ce qui concerne la
-- session courante.
create or replace function public.mes_participations_concours(p_saison text)
returns table (
  id bigint,
  type text,
  source text,
  personne_id bigint,
  personne_nom text,
  chef_equipe_id bigint,
  chef_equipe_nom text,
  date date,
  club text,
  pays text,
  hors_calendrier boolean,
  hors_pays boolean,
  repas_inclus boolean,
  montant_final numeric,
  statut text,
  paye_le timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  mon_id bigint;
begin
  select id into mon_id from public.personnes
  where lower(email) = lower(coalesce(auth.jwt()->>'email', '')) and supprime = false;
  if mon_id is null then
    return;
  end if;

  return query
  select
    pc.id, pc.type, pc.source, pc.personne_id,
    (p.prenom || ' ' || p.nom) as personne_nom,
    pc.chef_equipe_id,
    (cp.prenom || ' ' || cp.nom) as chef_equipe_nom,
    pc.date, pc.club, pc.pays, pc.hors_calendrier, pc.hors_pays, pc.repas_inclus,
    pc.montant_final, pc.statut, pc.paye_le
  from public.participations_concours pc
  join public.personnes p on p.id = pc.personne_id
  left join public.personnes cp on cp.id = pc.chef_equipe_id
  where pc.saison = p_saison
    and pc.supprime = false
    and (pc.personne_id = mon_id or pc.chef_equipe_id = mon_id)
  order by pc.date desc;
end;
$$;

revoke all on function public.mes_participations_concours from public;
grant execute on function public.mes_participations_concours to authenticated;
