-- Retour Jérôme, 26/07/2026 (test avec le compte fictif Jean TESTEUR) :
-- plutôt que d'afficher "réservé au comité" à la place des statistiques
-- individuelles National D2 pour un licencié non-CA, lui montrer SES
-- propres statistiques de joueur. `parties_d2` reste CA-only en lecture
-- directe (0006_verrouillage_stats.sql, données de tous les joueurs) — il
-- faut donc une fonction security definer qui ne renvoie que les lignes où
-- le nom de la session courante apparaît, jamais le reste.

create extension if not exists unaccent with schema public;

-- Même égalité "sans accents/casse" que sansAccents() (src/lib/stats.ts)
-- et rapprocherNomJoueur_() côté app v1 — comparaison par token exact
-- (pas une recherche floue), les noms dans joueurs_cm sont une liste
-- séparée par virgules ("Yves BACK, Jean DUPONT").
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
  mon_nom text;
begin
  mon_nom := public.mon_nom_benevole();
  if mon_nom is null then
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
      where upper(public.unaccent(trim(tok))) = upper(public.unaccent(mon_nom))
    );
end;
$$;

revoke all on function public.mes_parties_d2 from public;
grant execute on function public.mes_parties_d2 to authenticated;
