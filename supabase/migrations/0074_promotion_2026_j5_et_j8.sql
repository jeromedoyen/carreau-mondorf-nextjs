-- Promotion 2026 — les deux dernières feuilles de journée : J5 et J8 (08/10/2026).
--
-- Jérôme a récupéré les feuilles « Liste des équipes » des journées 5 et 8,
-- les seules qui manquaient. Avec J1 à J4, J6, J7, J9 et J10 (0065, 0070), la
-- saison est désormais connue équipe par équipe sur **10 journées sur 10**.
--
-- ────────────────────────────────────────────────────────────────────────
-- COMMENT LE RELEVÉ A ÉTÉ VÉRIFIÉ (même méthode que 0070)
-- ────────────────────────────────────────────────────────────────────────
--
-- Les 113 équipes des deux feuilles (64 en J5, 49 en J8) ont été relevées,
-- tous clubs confondus. Seules celles de Mondorf entrent en base, et **jamais
-- le nom d'un joueur adverse** (règle de 0064). Les autres ont servi à
-- vérifier, par un script :
--
--   · réciprocité : chaque partie A→B au tour t retrouve B→A au même tour,
--     avec un seul vainqueur — 448 lignes équipe-tour sur 448 (256 en J5, 192 en
--     J8, les quatre exempts de J8 mis à part) ;
--   · parties gagnées recomptées = colonne de la feuille, équipe par équipe ;
--   · total de chaque club recalculé (meilleure équipe mixte + les deux
--     meilleures des autres ; les trois meilleures quand le club n'a aucune
--     équipe mixte, Steinfort et Riganelli en J8) = total lu sur la feuille
--     **et** points déjà en base (tableau fédéral « Total Journées »,
--     0066) : 26 totaux de club sur 26.
--
-- **Aucune incohérence de feuille** cette fois : ni numéro d'adversaire
-- erroné, ni égalité, ni partie sans vainqueur. Aucune partie gagnée au temps
-- (toutes les parties ont un camp à 13), donc `au_temps` reste à faux.
--
-- ────────────────────────────────────────────────────────────────────────
-- NOMS
-- ────────────────────────────────────────────────────────────────────────
--
-- Graphie déjà en base quand le joueur y figure (les statistiques regroupent
-- par nom), sinon celle du registre :
--
--   · « Mathys Claude » (feuille J5, équipe 4) est **MATHIS Claude** : même
--     joueur, la fédération a varié l'orthographe d'un jour à l'autre.
--   · « Martins Tun » (feuille J8, équipe 1) est **MARTINS José Antonio** :
--     « Tun » est son surnom, déjà connu de `rapprochementJoueurs.ts`. La
--     graphie du registre est choisie plutôt que le surnom, pour que la clé
--     de rapprochement (`cle_nom_joueur`) tombe sur sa fiche sans détour.
--
-- La ligne de J8 jadis lue en tête de la feuille J9 (BERTEMES, FLAMMANG,
-- MARTINS Tun, 3 parties gagnées) était bien celle-ci : l'équipe 1 de J8,
-- confirmée à l'identique.

do $$
begin
  if exists (select 1 from public.promotion_equipes
              where saison = '2026' and journee in (5, 8)) then
    raise exception 'Des trios existent déjà pour les journées 5 et 8 — migration annulée plutôt que doublée.';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. LES 8 TRIOS DE MONDORF (J5 : 4, J8 : 4)
-- ─────────────────────────────────────────────────────────────────────────

insert into public.promotion_equipes
  (source_id, saison, journee, date, numero_equipe, categorie, type, joueur_1, joueur_2, joueur_3, parties_gagnees)
values
    ('PROMO-FLBP-2026-J5-E1', '2026', 5, '2026-05-09', 1, 'B', 'H', 'OLINGER Claude', 'TIHY Cyrille', 'SALVAN Thierry', 3),
    ('PROMO-FLBP-2026-J5-E2', '2026', 5, '2026-05-09', 2, 'B', 'H', 'STEPHAN Sylvain', 'STORONI Marc', 'BERTEMES Marco', 3),
    ('PROMO-FLBP-2026-J5-E3', '2026', 5, '2026-05-09', 3, 'B', 'M', 'MARION Stéphane', 'BACK Yves', 'KÄPPELE Stefanie', 1),
    ('PROMO-FLBP-2026-J5-E4', '2026', 5, '2026-05-09', 4, 'B', 'M', 'SALVAN Jocelyne', 'SCHOMER Jean-Marie', 'MATHIS Claude', 1),
    ('PROMO-FLBP-2026-J8-E1', '2026', 8, '2026-07-12', 1, 'A', 'M', 'BERTEMES Marco', 'FLAMMANG Marie-Jean', 'MARTINS José Antonio', 3),
    ('PROMO-FLBP-2026-J8-E2', '2026', 8, '2026-07-12', 2, 'B', 'H', 'WALTE Claude', 'HEISBOURG Nico', 'SALVAN Thierry', 2),
    ('PROMO-FLBP-2026-J8-E3', '2026', 8, '2026-07-12', 3, 'B', 'H', 'OLINGER Claude', 'PORCU Bruno', 'STEPHAN Sylvain', 3),
    ('PROMO-FLBP-2026-J8-E4', '2026', 8, '2026-07-12', 4, 'B', 'H', 'MATHIS Claude', 'SCHOMER Jean-Marie', 'BACK Yves', 3);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. LEURS 32 PARTIES
-- ─────────────────────────────────────────────────────────────────────────

with parties(source_equipe, numero, exempt, au_temps, adversaire_club, adversaire_no, score_cm, score_adverse) as (values
    ('PROMO-FLBP-2026-J5-E1', 1, false, false, 'Pétanque des Faubourgs', 13, 13, 5),
    ('PROMO-FLBP-2026-J5-E1', 2, false, false, 'Péta-Boules Schifflange', 57, 13, 2),
    ('PROMO-FLBP-2026-J5-E1', 3, false, false, 'Boule d''Or Esch', 39, 13, 12),
    ('PROMO-FLBP-2026-J5-E1', 4, false, false, 'B.P. Clair-Chêne Esch', 31, 8, 13),
    ('PROMO-FLBP-2026-J5-E2', 1, false, false, 'CBC Belvaux-Metzerlach', 35, 13, 8),
    ('PROMO-FLBP-2026-J5-E2', 2, false, false, 'USBP Dudelange', 5, 4, 13),
    ('PROMO-FLBP-2026-J5-E2', 3, false, false, 'A Rifat Steinfort', 26, 13, 9),
    ('PROMO-FLBP-2026-J5-E2', 4, false, false, 'Péta-Boules Schifflange', 55, 13, 7),
    ('PROMO-FLBP-2026-J5-E3', 1, false, false, 'Schierener Bullemettïen', 19, 12, 13),
    ('PROMO-FLBP-2026-J5-E3', 2, false, false, 'Péta-Boules Schifflange', 60, 13, 9),
    ('PROMO-FLBP-2026-J5-E3', 3, false, false, 'USBP Dudelange', 11, 9, 13),
    ('PROMO-FLBP-2026-J5-E3', 4, false, false, 'Péta-Boules Schifflange', 61, 10, 13),
    ('PROMO-FLBP-2026-J5-E4', 1, false, false, 'Schierener Bullemettïen', 17, 0, 13),
    ('PROMO-FLBP-2026-J5-E4', 2, false, false, 'Boule d''Or Esch', 42, 9, 13),
    ('PROMO-FLBP-2026-J5-E4', 3, false, false, 'Schierener Bullemettïen', 15, 13, 4),
    ('PROMO-FLBP-2026-J5-E4', 4, false, false, 'Stenemer Bulls Steinheim', 48, 7, 13),
    ('PROMO-FLBP-2026-J8-E1', 1, false, false, 'Riganelli Esch', 49, 12, 13),
    ('PROMO-FLBP-2026-J8-E1', 2, false, false, 'Péta-Boules Schifflange', 31, 13, 6),
    ('PROMO-FLBP-2026-J8-E1', 3, false, false, 'Boule d''Or Esch', 8, 13, 11),
    ('PROMO-FLBP-2026-J8-E1', 4, false, false, 'Pétanque des Faubourgs', 40, 13, 0),
    ('PROMO-FLBP-2026-J8-E2', 1, false, false, 'Schierener Bullemettïen', 19, 0, 13),
    ('PROMO-FLBP-2026-J8-E2', 2, false, false, 'Stenemer Bulls Steinheim', 37, 13, 6),
    ('PROMO-FLBP-2026-J8-E2', 3, false, false, 'Schierener Bullemettïen', 24, 1, 13),
    ('PROMO-FLBP-2026-J8-E2', 4, false, false, 'Pétanque des Faubourgs', 43, 13, 6),
    ('PROMO-FLBP-2026-J8-E3', 1, false, false, 'B.P. Clair-Chêne Esch', 6, 13, 2),
    ('PROMO-FLBP-2026-J8-E3', 2, false, false, 'Schierener Bullemettïen', 19, 12, 13),
    ('PROMO-FLBP-2026-J8-E3', 3, false, false, 'CBC Belvaux-Metzerlach', 47, 13, 11),
    ('PROMO-FLBP-2026-J8-E3', 4, false, false, 'Stenemer Bulls Steinheim', 39, 13, 4),
    ('PROMO-FLBP-2026-J8-E4', 1, false, false, 'Stenemer Bulls Steinheim', 39, 13, 7),
    ('PROMO-FLBP-2026-J8-E4', 2, false, false, 'Boule d''Or Esch', 8, 13, 9),
    ('PROMO-FLBP-2026-J8-E4', 3, false, false, 'Schierener Bullemettïen', 19, 4, 13),
    ('PROMO-FLBP-2026-J8-E4', 4, false, false, 'Péta-Boules Schifflange', 29, 13, 12)
)
insert into public.promotion_parties
  (equipe_id, numero, exempt, au_temps, adversaire_club, adversaire_numero_equipe, score_cm, score_adverse)
select e.id, p.numero, p.exempt, p.au_temps, p.adversaire_club, p.adversaire_no, p.score_cm, p.score_adverse
from parties p join public.promotion_equipes e on e.source_id = p.source_equipe;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. GARDE-FOUS — tout écart annule la migration entière
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  detail text;
  n integer;
begin
  -- a. Les totaux de club lus sur les deux feuilles (colonne « Total »)
  --    redonnent exactement les points déjà en base pour J5 et J8 : deux
  --    sources indépendantes, ces feuilles d'un côté, le tableau fédéral de
  --    l'autre. Kayl n'a joué ni l'une ni l'autre.
  with feuille(journee, club, points) as (values
    (5, 'Carreau Mondorf', 35), (5, 'USBP Dudelange', 50), (5, 'Pétanque des Faubourgs', 25), (5, 'Schierener Bullemettïen', 35), (5, 'A Rifat Steinfort', 30), (5, 'B.P. Clair-Chêne Esch', 50), (5, 'CBC Belvaux-Metzerlach', 30), (5, 'Club Bouliste Lasauvage', 10), (5, 'Boule d''Or Esch', 40), (5, 'Stenemer Bulls Steinheim', 20), (5, 'KaBoule', 40), (5, 'Péta-Boules Schifflange', 40), (5, 'Riganelli Esch', 40),
    (8, 'Carreau Mondorf', 45), (8, 'A Rifat Steinfort', 10), (8, 'B.P. Clair-Chêne Esch', 25), (8, 'Boule d''Or Esch', 35), (8, 'USBP Dudelange', 40), (8, 'Schierener Bullemettïen', 50), (8, 'Club Bouliste Lasauvage', 0), (8, 'Péta-Boules Schifflange', 30), (8, 'KaBoule', 20), (8, 'Stenemer Bulls Steinheim', 35), (8, 'Pétanque des Faubourgs', 30), (8, 'CBC Belvaux-Metzerlach', 45), (8, 'Riganelli Esch', 30)
  )
  select string_agg('J' || coalesce(r.journee, f.journee) || ' ' || coalesce(r.club, f.club) || ' ('
                    || coalesce(r.points::text, 'absent') || ' en base, '
                    || coalesce(f.points::text, 'absent') || ' sur la feuille)', ', ') into detail
    from (select journee, club, points from public.promotion_resultats_club
           where saison = '2026' and journee in (5, 8) and jouee) r
    full join feuille f on f.journee = r.journee and f.club = r.club
   where r.points is distinct from f.points;
  if detail is not null then
    raise exception 'Totaux de club : feuille ≠ base : %', detail;
  end if;

  -- b. Chaque trio de la saison a exactement ses quatre parties.
  select string_agg(e.source_id, ', ') into detail
    from public.promotion_equipes e
   where e.saison = '2026'
     and (select count(*) from public.promotion_parties p where p.equipe_id = e.id) <> 4;
  if detail is not null then raise exception 'Trios sans leurs quatre parties : %', detail; end if;

  -- c. Parties gagnées recomptées (au temps compris) = bilan du trio.
  select string_agg(e.source_id, ', ') into detail
    from public.promotion_equipes e
   where e.saison = '2026'
     and e.parties_gagnees <> (select count(*) from public.promotion_parties p
                                where p.equipe_id = e.id and p.gagnee);
  if detail is not null then raise exception 'Parties gagnées ≠ bilan du trio : %', detail; end if;

  -- d. Clubs adverses connus du classement de la saison.
  select count(*) into n
    from public.promotion_parties p join public.promotion_equipes e on e.id = p.equipe_id
   where e.saison = '2026' and not p.exempt
     and not exists (select 1 from public.promotion_classement c
                      where c.saison = e.saison and c.club = p.adversaire_club);
  if n > 0 then raise exception '% partie(s) avec un club adverse inconnu.', n; end if;

  -- e. Chaque trio porte la date de sa journée dans les résultats de club.
  select string_agg(distinct 'J' || e.journee, ', ') into detail
    from public.promotion_equipes e
    join public.promotion_resultats_club r
      on r.saison = e.saison and r.journee = e.journee and r.club = 'Carreau Mondorf'
   where e.saison = '2026' and e.date <> r.date;
  if detail is not null then raise exception 'Date des trios ≠ date de la journée : %', detail; end if;

  -- f. LE recoupement, sur les dix journées : les trios de Mondorf redonnent
  --    les points du club selon la règle « trois équipes dont au moins une
  --    mixte » (la meilleure mixte, puis les deux meilleures des autres).
  with t as (
    select journee, id, type, parties_gagnees from public.promotion_equipes where saison = '2026'
  ),
  mixte as (
    select distinct on (journee) journee, id, parties_gagnees
      from t where type = 'M' order by journee, parties_gagnees desc, id
  ),
  reste as (
    select t.journee, t.parties_gagnees,
           row_number() over (partition by t.journee order by t.parties_gagnees desc, t.id) as rang
      from t left join mixte m on m.id = t.id
     where m.id is null
  ),
  calcul as (
    select j.journee,
           5 * (coalesce(m.parties_gagnees, 0)
                + coalesce((select sum(r.parties_gagnees) from reste r
                             where r.journee = j.journee and r.rang <= case when m.id is null then 3 else 2 end), 0)) as points
      from (select distinct journee from t) j
      left join mixte m on m.journee = j.journee
  )
  select string_agg('J' || c.journee || ' (' || c.points || ' calculés, ' || coalesce(r.points::text, '?') || ' en base)', ', ')
    into detail
    from calcul c
    left join public.promotion_resultats_club r
      on r.saison = '2026' and r.journee = c.journee and r.club = 'Carreau Mondorf'
   where r.points is distinct from c.points;
  if detail is not null then raise exception 'Points de Mondorf ≠ règle de la mixte : %', detail; end if;

  select count(distinct journee) into n from public.promotion_equipes where saison = '2026';
  if n <> 10 then raise exception '% journées couvertes au lieu de 10.', n; end if;

  raise notice 'Promotion 2026 : 8 trios et 32 parties ajoutés, 10 journées sur 10 couvertes.';
end $$;
