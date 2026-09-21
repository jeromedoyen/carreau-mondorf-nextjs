-- CORRECTIF BLOQUANT — `mes_parties_d2()` (migration 0022) ne renvoyait
-- jamais rien, pour personne.
--
-- Elle comparait le nom de session à chaque joueur d'une partie par égalité
-- exacte, alors que les deux côtés n'écrivent pas le nom dans le même ordre :
--
--   mon_nom_benevole()      -> prenom || ' ' || nom   « Marie-Louise SCHMIT »
--   parties_d2.joueurs_cm   -> nom puis prénom        « SCHMIT Marie-Louise »
--
-- Mesuré sur la base au 21/09/2026 : 0 des 18 joueurs D2 correspondait au
-- format testé, les 18 correspondaient au format inverse. Conséquence
-- visible : la carte « Compétition » de /moncaro affichait « aucune partie
-- cette saison » à tous les licenciés, y compris aux dix joueurs du titre.
--
-- Plutôt que de deviner où finit le prénom (« José Antonio MARTINS », « Yann
-- LE BERRE » — toute heuristique de découpage casse sur ces cas), on compare
-- l'ENSEMBLE des mots, trié. « MARIE LOUISE SCHMIT » des deux côtés, quel que
-- soit l'ordre d'écriture. Deux licenciés distincts composés exactement des
-- mêmes mots seraient confondus : ça n'existe pas dans le registre, et ça
-- reviendrait de toute façon à deux homonymes parfaits.

create extension if not exists unaccent with schema public;

-- Clé de comparaison d'un nom de joueur : sans accents, sans casse, sans
-- ponctuation (le trait d'union de « Marie-Louise » devient une coupure de
-- mot des deux côtés, donc sans effet), mots triés par ordre alphabétique.
--
-- `stable` et non `immutable` : unaccent() dépend d'un dictionnaire, donc
-- n'est pas immutable — cette clé ne peut pas servir d'index fonctionnel.
-- Sans importance ici, parties_d2 tient en quelques centaines de lignes.
create or replace function public.cle_nom_joueur(p_nom text)
returns text
language sql
stable
set search_path = ''
as $$
  select string_agg(mot, ' ' order by mot)
  from unnest(
    string_to_array(
      regexp_replace(upper(public.unaccent(coalesce(p_nom, ''))), '[^A-Z0-9]+', ' ', 'g'),
      ' '
    )
  ) as mot
  where mot <> '';
$$;

comment on function public.cle_nom_joueur is
  'Clé de rapprochement d''un nom de joueur, insensible à l''ordre prénom/nom, '
  'aux accents, à la casse et à la ponctuation. Voir migration 0061.';

create or replace function public.mes_parties_d2(p_saison text)
returns table (
  rencontre_id bigint,
  type text,
  phase int,
  joueurs_cm text,
  score_cm int,
  score_adverse int,
  journee int,
  date date,
  club_adverse text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ma_cle text;
begin
  ma_cle := public.cle_nom_joueur(public.mon_nom_benevole());
  if ma_cle is null or ma_cle = '' then
    return;
  end if;

  return query
  select p.rencontre_id, p.type, p.phase, p.joueurs_cm, p.score_cm, p.score_adverse,
         r.journee, r.date, r.club_adverse
  from public.parties_d2 p
  join public.rencontres_d2 r on r.id = p.rencontre_id
  where r.saison = p_saison
    and p.supprime = false
    and p.score_cm is not null
    and p.score_adverse is not null
    and exists (
      select 1 from unnest(string_to_array(p.joueurs_cm, ',')) as tok
      where public.cle_nom_joueur(tok) = ma_cle
    );
end;
$$;

revoke all on function public.cle_nom_joueur from public;
grant execute on function public.cle_nom_joueur to authenticated;
revoke all on function public.mes_parties_d2 from public;
grant execute on function public.mes_parties_d2 to authenticated;
