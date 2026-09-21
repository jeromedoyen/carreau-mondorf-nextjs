-- Tableau de bord individuel du licencié (/moncaro) — enrichit ce que le
-- serveur renvoie déjà, sans ouvrir la moindre ligne supplémentaire : tout
-- reste scopé à la session appelante, `parties_d2` / `adhesions` restent
-- CA-only en lecture directe.
--
-- Trois colonnes manquaient pour des indicateurs pourtant calculables :
--
--   domicile                 -> bilan à domicile / à l'extérieur
--   score_rencontre_*        -> contexte du résultat collectif
--   ordre                    -> départage stable des parties d'une même
--                               journée, nécessaire au calcul des séries
--
-- Le type de retour change, donc drop puis recreate (Postgres refuse un
-- create or replace qui modifie la signature de sortie).

drop function if exists public.mes_parties_d2(text);

create function public.mes_parties_d2(p_saison text)
returns table (
  rencontre_id bigint,
  type text,
  phase int,
  ordre int,
  joueurs_cm text,
  score_cm int,
  score_adverse int,
  journee int,
  date date,
  club_adverse text,
  domicile boolean,
  score_rencontre_cm int,
  score_rencontre_adverse int
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
  select p.rencontre_id, p.type, p.phase, p.ordre, p.joueurs_cm,
         p.score_cm, p.score_adverse,
         r.journee, r.date, r.club_adverse, r.domicile,
         r.score_cm as score_rencontre_cm,
         r.score_adverse as score_rencontre_adverse
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

revoke all on function public.mes_parties_d2 from public;
grant execute on function public.mes_parties_d2 to authenticated;

-- Combien de rencontres l'équipe a-t-elle réellement disputées dans la
-- saison ? Dénominateur du taux de présence en équipe. Les journées
-- « Exempt » (sans adversaire) n'en font pas partie : personne n'y joue,
-- les compter pénaliserait tout le monde à tort.
--
-- Donnée collective et non personnelle (c'est le calendrier du club), mais
-- `rencontres_d2` n'est pas lisible par un licencié non-CA : on l'expose
-- donc réduite à un simple compte, jamais ligne à ligne.
create or replace function public.rencontres_jouees_saison(p_saison text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.rencontres_d2
  where saison = p_saison
    and statut = 'Jouée';
$$;

revoke all on function public.rencontres_jouees_saison from public;
grant execute on function public.rencontres_jouees_saison to authenticated;

-- Ajoute le numéro de licence au retour de mon_adhesion() (migration 0026).
-- La colonne `adhesions.licence` existait déjà mais n'était pas exposée ;
-- c'est une donnée dont le licencié est le premier concerné, et elle figure
-- en en-tête de sa fiche.
create or replace function public.mon_adhesion(p_saison text)
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
    select
      a.type,
      a.categorie,
      a.licence as numero_licence,
      a.cotisation_payee,
      a.cotisation_montant,
      a.cotisation_date,
      a.licence_payee,
      a.licence_montant,
      a.licence_date
    from public.adhesions a
    join public.personnes p on p.id = a.personne_id
    where lower(p.email) = email_session
      and a.annee = p_saison
      and a.supprime = false
      and p.supprime = false
    limit 1
  ) t;

  return resultat;
end;
$$;

revoke all on function public.mon_adhesion from public;
grant execute on function public.mon_adhesion to authenticated;
