-- Classement du championnat Promotion (23/09/2026, demande de Jérôme).
--
-- `promotion_equipes` ne porte que les trios de Carreau Mondorf, et seulement
-- pour les journées dont la FLBP a publié la feuille détaillée (J6 et J10 en
-- 2026, cf. 0065). Le classement des quatorze clubs, lui, n'avait aucune
-- place en base. Deux tables, parce que ce sont deux faits de grain différent :
--
--   promotion_resultats_club   les points de chaque club à chaque journée
--   promotion_classement       le classement officiel, tel que publié par la
--                              FLBP à l'issue d'une journée
--
-- ─────────────────────────────────────────────────────────────────────────
-- POURQUOI STOCKER LE CLASSEMENT PUBLIÉ AU LIEU DE LE RECALCULER
-- ─────────────────────────────────────────────────────────────────────────
--
-- Le départage à égalité de points se fait au nombre de « 4/4 » (équipes
-- ayant gagné leurs quatre parties) — établi sur les documents : après J6,
-- Mondorf (195 pts, 2 × 4/4) devance KaBoule (195, 1) ; après J8, Clair-Chêne,
-- Riganelli et Belvaux, tous à 280, sont rangés 4/4 décroissants (4, 3, 2).
--
-- Mais ce décompte n'est publié que cumulé, jamais par journée, et sa règle
-- exacte n'est écrite nulle part : en J10, une équipe du Clair-Chêne gagne ses
-- quatre parties sans que ce 4/4 soit compté (le club reste à 4). On ne peut
-- donc pas le reconstituer. Même leçon qu'en D2 (session du 01/09) : quand la
-- fédération publie son classement, s'aligner dessus plutôt que recalculer.
--
-- ─────────────────────────────────────────────────────────────────────────
-- SOURCES (médiathèque flbp.lu, inventaire du 23/09/2026)
-- ─────────────────────────────────────────────────────────────────────────
--
--   PROMO-rect-…-Total-journees…   points par club et par journée, J1 à J8
--   PROMO-Resultats-6 / -10        feuilles complètes des J6 et J10
--   PROMO-Classement-6 / -8 / -10  classements officiels après J6, J8, J10
--
-- **J9 n'a jamais été publiée.** Ses points sont déduits, club par club :
-- classement après J10 − classement après J8 − points de la J10. Marqués
-- `deduit = true`. Tous tombent sur un multiple de 5 positif — c'est une
-- vérification en soi, une erreur de lecture l'aurait très probablement
-- trahie.
--
-- Règle de score lue sur les deux feuilles et vérifiée sur les treize clubs
-- de chacune : **un club marque avec ses trois meilleures équipes**
-- (parties gagnées × 5). Boule d'Or aligne cinq équipes en J10 (2, 3, 2, 3, 1
-- victoires) et marque 8 × 5 = 40, pas 11 × 5.
--
-- Dates : celles des en-têtes du tableau fédéral. La J5 y est au **10/05**,
-- là où `calendrier_federation` porte le 09/05 — écart déjà signalé en 0065,
-- non tranché ici ; la table suit sa source.
--
-- Noms de clubs : graphie déjà en base pour les clubs de National D2
-- (« KaBoule », « A Rifat Steinfort », « CBC Belvaux-Metzerlach »,
-- « Schierener Bullemettïen ») — un club doit s'écrire pareil dans les deux
-- championnats. Graphie FLBP pour les six autres.
--
-- ⚠️ Écart dans les documents fédéraux, conservé tel quel : Kayl a
-- « 4 rencontres » dans le classement après J6, puis « 3 » après J8 et J10 —
-- un nombre de rencontres ne peut pas baisser. Le tableau « Total Journées »,
-- dont le nom de fichier porte « Vérifié », dit 3 : Kayl a joué J1, J2 et J4,
-- et ses 0 point des autres journées sont des absences. C'est ce que dit
-- `promotion_resultats_club`. Le classement après J6 garde le 4 publié : cette
-- table recopie la fédération, elle ne la corrige pas.

-- ─────────────────────────────────────────────────────────────────────────
-- STRUCTURE
-- ─────────────────────────────────────────────────────────────────────────

create table public.promotion_resultats_club (
  id bigint generated always as identity primary key,
  source_id text not null unique,
  saison text not null,
  journee integer not null check (journee >= 1),
  date date not null,
  club text not null,
  -- Distinct de « 0 point » : Lasauvage joue la J8 et n'y marque rien,
  -- Kayl n'y joue pas.
  jouee boolean not null,
  points integer check (points is null or (points >= 0 and points % 5 = 0)),
  -- Vrai pour une valeur calculée par différence, faux pour une valeur lue
  -- sur un document fédéral.
  deduit boolean not null default false,
  check ((jouee and points is not null) or (not jouee and points is null)),
  unique (saison, journee, club)
);
create index promotion_resultats_club_saison_idx on public.promotion_resultats_club (saison);

create table public.promotion_classement (
  id bigint generated always as identity primary key,
  source_id text not null unique,
  saison text not null,
  apres_journee integer not null check (apres_journee >= 1),
  position integer not null check (position >= 1),
  club text not null,
  rencontres_jouees integer not null check (rencontres_jouees >= 0),
  quatre_quatre integer not null check (quatre_quatre >= 0),
  points integer not null check (points >= 0),
  unique (saison, apres_journee, club),
  unique (saison, apres_journee, position)
);
create index promotion_classement_saison_idx on public.promotion_classement (saison);

-- Même accès que le reste du module Promotion (0007_verrouillage_promotion) :
-- lecture réservée aux utilisateurs autorisés. Aucune policy d'écriture —
-- comme `division_d2_resultats`, ces tables ne s'alimentent que par
-- migration, depuis les documents de la fédération.
alter table public.promotion_resultats_club enable row level security;
alter table public.promotion_classement enable row level security;
create policy "lecture licenciés" on public.promotion_resultats_club
  for select using (public.est_utilisateur_autorise());
create policy "lecture licenciés" on public.promotion_classement
  for select using (public.est_utilisateur_autorise());

-- ─────────────────────────────────────────────────────────────────────────
-- DONNÉES 2026
-- ─────────────────────────────────────────────────────────────────────────

with clubs(code, club, pts) as (values
  -- code  club                          J1  J2  J3  J4  J5  J6  J7  J8  J9* J10
  ('DUD',  'USBP Dudelange',             array[50, 40, 50, 45, 50, 55, 45, 40, 45, 55]),
  ('SCHF', 'Péta-Boules Schifflange',    array[40, 40, 55, 50, 40, 35, 50, 30, 40, 35]),
  ('SCHR', 'Schierener Bullemettïen',    array[35, 35, 45, 45, 35, 45, 45, 50, 50, 35]),
  ('BOR',  'Boule d''Or Esch',           array[45, 40, 30, 40, 40, 50, 45, 35, 30, 40]),
  ('CLC',  'B.P. Clair-Chêne Esch',      array[40, 45, 45, 15, 50, 20, 40, 25, 25, 30]),
  ('RIG',  'Riganelli Esch',             array[40, 40, 45, 35, 40, 25, 25, 30, 35, 10]),
  ('BEL',  'CBC Belvaux-Metzerlach',     array[25, 45, 40, 30, 30, 30, 35, 45, 30, 20]),
  ('CM',   'Carreau Mondorf',            array[45, 40, 20, 40, 35, 15, 30, 45, 20, 25]),
  ('STH',  'Stenemer Bulls Steinheim',   array[25, 40, 35, 25, 20, 40, 35, 35, 20, 30]),
  ('KAB',  'KaBoule',                    array[30, 40, 35, 15, 40, 35, 25, 20, 20, 50]),
  ('FAU',  'Pétanque des Faubourgs',     array[35, 15, 35, 25, 25, 30, 15, 30,  5, 25]),
  ('STF',  'A Rifat Steinfort',          array[25, 40, 20, 20, 30, 20, 20, 10, 45, 15]),
  ('LAS',  'Club Bouliste Lasauvage',    array[45, 25, 20, 15, 10,  5, 35,  0, 15,  5]),
  ('KAY',  'Pétanque & Boules Kayl',     array[10,  5, null, 10, null, null, null, null, null, null]::integer[])
),
journees(journee, date) as (values
  (1, date '2026-04-12'), (2, date '2026-04-19'), (3, date '2026-04-25'),
  (4, date '2026-05-02'), (5, date '2026-05-10'), (6, date '2026-05-17'),
  (7, date '2026-07-05'), (8, date '2026-07-12'), (9, date '2026-08-30'),
  (10, date '2026-09-06')
)
insert into public.promotion_resultats_club (source_id, saison, journee, date, club, jouee, points, deduit)
select
  'PROMOCLUB-FLBP-2026-J' || j.journee || '-' || c.code,
  '2026', j.journee, j.date, c.club,
  c.pts[j.journee] is not null,
  c.pts[j.journee],
  j.journee = 9
from clubs c cross join journees j;

with clubs(code, club) as (values
  ('DUD', 'USBP Dudelange'), ('SCHF', 'Péta-Boules Schifflange'),
  ('SCHR', 'Schierener Bullemettïen'), ('BOR', 'Boule d''Or Esch'),
  ('CLC', 'B.P. Clair-Chêne Esch'), ('RIG', 'Riganelli Esch'),
  ('BEL', 'CBC Belvaux-Metzerlach'), ('CM', 'Carreau Mondorf'),
  ('STH', 'Stenemer Bulls Steinheim'), ('KAB', 'KaBoule'),
  ('FAU', 'Pétanque des Faubourgs'), ('STF', 'A Rifat Steinfort'),
  ('LAS', 'Club Bouliste Lasauvage'), ('KAY', 'Pétanque & Boules Kayl')
),
publie(apres_journee, position, code, rencontres, quatre_quatre, points) as (values
  -- PROMO-Classement-6.png
  (6,  1, 'DUD',  6, 5, 290), (6,  2, 'SCHF', 6, 5, 260), (6,  3, 'BOR',  6, 5, 245),
  (6,  4, 'SCHR', 6, 0, 240), (6,  5, 'RIG',  6, 3, 225), (6,  6, 'CLC',  6, 3, 215),
  (6,  7, 'BEL',  6, 0, 200), (6,  8, 'CM',   6, 2, 195), (6,  9, 'KAB',  6, 1, 195),
  (6, 10, 'STH',  6, 0, 185), (6, 11, 'FAU',  6, 0, 165), (6, 12, 'STF',  6, 0, 155),
  (6, 13, 'LAS',  6, 0, 120), (6, 14, 'KAY',  4, 0,  25),
  -- PROMO-Classement-8.png
  (8,  1, 'DUD',  8, 6, 375), (8,  2, 'SCHF', 8, 6, 340), (8,  3, 'SCHR', 8, 1, 335),
  (8,  4, 'BOR',  8, 6, 325), (8,  5, 'CLC',  8, 4, 280), (8,  6, 'RIG',  8, 3, 280),
  (8,  7, 'BEL',  8, 2, 280), (8,  8, 'CM',   8, 2, 270), (8,  9, 'STH',  8, 0, 255),
  (8, 10, 'KAB',  8, 1, 240), (8, 11, 'FAU',  8, 0, 210), (8, 12, 'STF',  8, 0, 185),
  (8, 13, 'LAS',  8, 0, 155), (8, 14, 'KAY',  3, 0,  25),
  -- PROMO-Classement-10.png — classement final
  (10,  1, 'DUD',  10, 9, 475), (10,  2, 'SCHR', 10, 2, 420), (10,  3, 'SCHF', 10, 6, 415),
  (10,  4, 'BOR',  10, 6, 395), (10,  5, 'CLC',  10, 4, 335), (10,  6, 'BEL',  10, 2, 330),
  (10,  7, 'RIG',  10, 4, 325), (10,  8, 'CM',   10, 2, 315), (10,  9, 'KAB',  10, 2, 310),
  (10, 10, 'STH',  10, 0, 305), (10, 11, 'STF',  10, 0, 245), (10, 12, 'FAU',  10, 0, 240),
  (10, 13, 'LAS',  10, 0, 175), (10, 14, 'KAY',   3, 0,  25)
)
insert into public.promotion_classement
  (source_id, saison, apres_journee, position, club, rencontres_jouees, quatre_quatre, points)
select
  'PROMOCLT-FLBP-2026-J' || p.apres_journee || '-' || p.code,
  '2026', p.apres_journee, p.position, c.club, p.rencontres, p.quatre_quatre, p.points
from publie p join clubs c using (code);

-- ─────────────────────────────────────────────────────────────────────────
-- GARDE-FOUS — toute incohérence annule la migration entière
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  n integer;
  detail text;
begin
  -- 1. Chaque journée couvre exactement les quatorze clubs.
  select count(*) into n from (
    select journee from public.promotion_resultats_club
     where saison = '2026' group by journee having count(*) <> 14
  ) t;
  if n > 0 then raise exception 'Une journée ne compte pas 14 clubs.'; end if;

  -- 2. Chaque classement publié compte 14 clubs et les positions 1 à 14.
  select count(*) into n from (
    select apres_journee from public.promotion_classement where saison = '2026'
     group by apres_journee
    having count(*) <> 14 or min(position) <> 1 or max(position) <> 14
  ) t;
  if n > 0 then raise exception 'Un classement publié est incomplet.'; end if;

  -- 3. LE contrôle de lecture : pour chaque club et chaque classement publié,
  --    la somme des points de journée égale les points du classement.
  --    Après J6 et J8, c'est une vérification indépendante : deux documents
  --    différents (« Total Journées » et classement) doivent concorder sur les
  --    quatorze clubs. Après J10, elle est vraie par construction pour la J9,
  --    déduite de ce classement — elle vérifie alors la J10 et la saisie.
  select string_agg(c.club || ' après J' || c.apres_journee, ', ') into detail
    from public.promotion_classement c
   where c.saison = '2026'
     and c.points <> (select coalesce(sum(r.points), 0)
                        from public.promotion_resultats_club r
                       where r.saison = c.saison and r.club = c.club
                         and r.journee <= c.apres_journee);
  if detail is not null then
    raise exception 'Points de journée ≠ classement publié : %', detail;
  end if;

  -- 4. Rencontres jouées = journées marquées jouées. Seule exception admise,
  --    et nommée : Kayl dans le classement après J6 (4 publié, 3 partout
  --    ailleurs — voir en-tête).
  select string_agg(c.club || ' après J' || c.apres_journee, ', ') into detail
    from public.promotion_classement c
   where c.saison = '2026'
     and not (c.club = 'Pétanque & Boules Kayl' and c.apres_journee = 6)
     and c.rencontres_jouees <> (select count(*)
                                   from public.promotion_resultats_club r
                                  where r.saison = c.saison and r.club = c.club
                                    and r.journee <= c.apres_journee and r.jouee);
  if detail is not null then
    raise exception 'Rencontres jouées incohérentes : %', detail;
  end if;

  -- 5. L'ordre publié respecte « points décroissants, puis 4/4 décroissants ».
  select count(*) into n
    from public.promotion_classement a
    join public.promotion_classement b
      on b.saison = a.saison and b.apres_journee = a.apres_journee
     and b.position = a.position + 1
   where a.saison = '2026'
     and (b.points > a.points or (b.points = a.points and b.quatre_quatre > a.quatre_quatre));
  if n > 0 then raise exception 'Ordre du classement contraire au départage attendu.'; end if;

  -- 6. Concordance avec les trios de Mondorf déjà en base (0065) : leurs
  --    parties gagnées × 5 doivent redonner les points du club en J6 et J10.
  --    Mondorf n'aligne pas plus de trois équipes ces jours-là, donc toutes
  --    comptent.
  select count(*) into n
    from public.promotion_resultats_club r
   where r.saison = '2026' and r.club = 'Carreau Mondorf' and r.journee in (6, 10)
     and r.points <> (select sum(e.parties_gagnees) * 5 from public.promotion_equipes e
                       where e.saison = r.saison and e.journee = r.journee);
  if n > 0 then raise exception 'Points de Mondorf ≠ somme de ses trios (J6/J10).'; end if;

  raise notice 'Promotion 2026 : 140 résultats de journée et 3 classements officiels insérés, six contrôles passés.';
end $$;
