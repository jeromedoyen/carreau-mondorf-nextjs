-- National D2 2026 — la journée 14 de la poule, et le recoupement complet de
-- la saison (25/09/2026).
--
-- Jérôme transmet le tableau fédéral « Résultats Championnat National -
-- Division 1 / Division 2 » couvrant toute la saison. La J14 manquait depuis
-- le 21/09 : seule notre rencontre était en base (`DIVD2-FEUILLE-2026-J14-CM`,
-- depuis notre feuille de match), la FLBP n'ayant rien publié en ligne.
--
-- J14 (19/09/2026) :
--   Club Bouliste Lasauvage 29 – 34 Schierener Bullemettïen
--   CBC Belvaux-Metzerlach 34 – 29 A Rifat Steinfort
--   Carreau Mondorf 37 – 26 KaBoule            ← déjà en base, confirmé
--   exempt : Stenemer Bulls Steinheim
--
-- ⚠️ La ligne « exempt » de la J14 est coupée au bas de l'image transmise.
-- Steinheim est le seul des sept clubs absent des trois rencontres, et c'est
-- aussi l'exempt de la J7, que la J14 rejoue en miroir (règle de la poule à
-- sept, notée le 21/09). Déduit, pas lu — dit ici.
--
-- Noms de clubs : graphie déjà en base (« KaBoule », « Stenemer Bulls
-- Steinheim », « A Rifat Steinfort », « Schierener Bullemettïen »), le
-- classement regroupant par chaîne de caractères.
--
-- Le garde-fou ne se contente pas de la J14 : il recoupe **les quatorze
-- journées** de la table avec le tableau fédéral — chaque rencontre, ses deux
-- scores, sa date, et chaque exempt. Les J1 à J10 venaient de l'import V1,
-- les J11 à J13 de trois documents FLBP différents : c'est la première fois
-- que la saison entière est confrontée à une seule source.

insert into public.division_d2_resultats
  (source_id, saison, journee, date, club_a, club_b, points_a, points_b, exempt)
select v.source_id, '2026', 14, date '2026-09-19', v.club_a, v.club_b, v.points_a, v.points_b, v.exempt
from (values
  ('DIVD2-FLBP-2026-J14-1', 'Club Bouliste Lasauvage', 'Schierener Bullemettïen', 29, 34, null),
  ('DIVD2-FLBP-2026-J14-2', 'CBC Belvaux-Metzerlach', 'A Rifat Steinfort', 34, 29, null),
  ('DIVD2-FLBP-2026-J14-4', null, null, null, null, 'Stenemer Bulls Steinheim')
) as v(source_id, club_a, club_b, points_a, points_b, exempt)
where not exists (
  select 1 from public.division_d2_resultats d where d.source_id = v.source_id
);

do $$
declare
  detail text;
  n integer;
begin
  -- 1. Le tableau fédéral complet de la saison, recopié.
  create temporary table flbp_d2_2026 (
    journee integer, date date, club_a text, club_b text, points_a integer, points_b integer, exempt text
  ) on commit drop;
  insert into flbp_d2_2026 values
    (1, '2026-04-11', 'Stenemer Bulls Steinheim', 'Carreau Mondorf', 27, 36, null),
    (1, '2026-04-11', 'Schierener Bullemettïen', 'A Rifat Steinfort', 44, 19, null),
    (1, '2026-04-12', 'KaBoule', 'CBC Belvaux-Metzerlach', 52, 11, null),
    (1, null, null, null, null, null, 'Club Bouliste Lasauvage'),
    (2, '2026-04-18', 'Club Bouliste Lasauvage', 'A Rifat Steinfort', 40, 23, null),
    (2, '2026-04-18', 'Stenemer Bulls Steinheim', 'CBC Belvaux-Metzerlach', 29, 34, null),
    (2, '2026-04-19', 'KaBoule', 'Schierener Bullemettïen', 28, 35, null),
    (2, null, null, null, null, null, 'Carreau Mondorf'),
    (3, '2026-04-25', 'Club Bouliste Lasauvage', 'Carreau Mondorf', 19, 44, null),
    (3, '2026-04-25', 'A Rifat Steinfort', 'KaBoule', 31, 32, null),
    (3, '2026-04-25', 'Schierener Bullemettïen', 'Stenemer Bulls Steinheim', 38, 25, null),
    (3, null, null, null, null, null, 'CBC Belvaux-Metzerlach'),
    (4, '2026-05-02', 'Club Bouliste Lasauvage', 'KaBoule', 31, 32, null),
    (4, '2026-05-02', 'Carreau Mondorf', 'CBC Belvaux-Metzerlach', 51, 12, null),
    (4, '2026-05-02', 'Stenemer Bulls Steinheim', 'A Rifat Steinfort', 29, 34, null),
    (4, null, null, null, null, null, 'Schierener Bullemettïen'),
    (5, '2026-05-03', 'CBC Belvaux-Metzerlach', 'Club Bouliste Lasauvage', 42, 21, null),
    (5, '2026-05-09', 'Schierener Bullemettïen', 'Carreau Mondorf', 23, 40, null),
    (5, '2026-05-09', 'KaBoule', 'Stenemer Bulls Steinheim', 34, 29, null),
    (5, null, null, null, null, null, 'A Rifat Steinfort'),
    (6, '2026-05-16', 'Club Bouliste Lasauvage', 'Stenemer Bulls Steinheim', 31, 32, null),
    (6, '2026-05-16', 'CBC Belvaux-Metzerlach', 'Schierener Bullemettïen', 18, 45, null),
    (6, '2026-05-16', 'Carreau Mondorf', 'A Rifat Steinfort', 31, 32, null),
    (6, null, null, null, null, null, 'KaBoule'),
    (7, '2026-06-20', 'Schierener Bullemettïen', 'Club Bouliste Lasauvage', 19, 44, null),
    (7, '2026-06-20', 'A Rifat Steinfort', 'CBC Belvaux-Metzerlach', 40, 23, null),
    (7, '2026-06-21', 'KaBoule', 'Carreau Mondorf', 28, 35, null),
    (7, null, null, null, null, null, 'Stenemer Bulls Steinheim'),
    (8, '2026-07-04', 'A Rifat Steinfort', 'Schierener Bullemettïen', 34, 29, null),
    (8, '2026-07-04', 'Carreau Mondorf', 'Stenemer Bulls Steinheim', 41, 22, null),
    (8, '2026-07-04', 'CBC Belvaux-Metzerlach', 'KaBoule', 20, 43, null),
    (8, null, null, null, null, null, 'Club Bouliste Lasauvage'),
    (9, '2026-07-11', 'A Rifat Steinfort', 'Club Bouliste Lasauvage', 26, 37, null),
    (9, '2026-07-11', 'Schierener Bullemettïen', 'KaBoule', 27, 36, null),
    (9, '2026-07-11', 'CBC Belvaux-Metzerlach', 'Stenemer Bulls Steinheim', 47, 16, null),
    (9, null, null, null, null, null, 'Carreau Mondorf'),
    (10, '2026-07-18', 'Carreau Mondorf', 'Club Bouliste Lasauvage', 41, 22, null),
    (10, '2026-07-18', 'Stenemer Bulls Steinheim', 'Schierener Bullemettïen', 42, 21, null),
    (10, '2026-07-19', 'KaBoule', 'A Rifat Steinfort', 32, 31, null),
    (10, null, null, null, null, null, 'CBC Belvaux-Metzerlach'),
    (11, '2026-07-25', 'CBC Belvaux-Metzerlach', 'Carreau Mondorf', 38, 25, null),
    (11, '2026-07-25', 'A Rifat Steinfort', 'Stenemer Bulls Steinheim', 25, 38, null),
    (11, '2026-07-26', 'KaBoule', 'Club Bouliste Lasauvage', 32, 31, null),
    (11, null, null, null, null, null, 'Schierener Bullemettïen'),
    (12, '2026-08-29', 'Club Bouliste Lasauvage', 'CBC Belvaux-Metzerlach', 39, 24, null),
    (12, '2026-08-29', 'Carreau Mondorf', 'Schierener Bullemettïen', 44, 19, null),
    (12, '2026-08-29', 'Stenemer Bulls Steinheim', 'KaBoule', 51, 12, null),
    (12, null, null, null, null, null, 'A Rifat Steinfort'),
    (13, '2026-09-05', 'Stenemer Bulls Steinheim', 'Club Bouliste Lasauvage', 37, 26, null),
    (13, '2026-09-05', 'Schierener Bullemettïen', 'CBC Belvaux-Metzerlach', 36, 27, null),
    (13, '2026-09-05', 'A Rifat Steinfort', 'Carreau Mondorf', 16, 47, null),
    (13, null, null, null, null, null, 'KaBoule'),
    (14, '2026-09-19', 'Club Bouliste Lasauvage', 'Schierener Bullemettïen', 29, 34, null),
    (14, '2026-09-19', 'CBC Belvaux-Metzerlach', 'A Rifat Steinfort', 34, 29, null),
    (14, '2026-09-19', 'Carreau Mondorf', 'KaBoule', 37, 26, null),
    (14, null, null, null, null, null, 'Stenemer Bulls Steinheim');

  -- 2. Chaque rencontre du tableau existe en base, même date, mêmes scores
  --    (dans un sens ou dans l'autre : A et B peuvent être inversés).
  select string_agg('J' || f.journee || ' ' || f.club_a || ' ' || f.points_a || '-' || f.points_b || ' ' || f.club_b, ' ; ')
    into detail
    from flbp_d2_2026 f
   where f.exempt is null
     and not exists (
       select 1 from public.division_d2_resultats d
        where d.saison = '2026' and d.journee = f.journee and d.date = f.date
          and ((d.club_a = f.club_a and d.club_b = f.club_b and d.points_a = f.points_a and d.points_b = f.points_b)
            or (d.club_a = f.club_b and d.club_b = f.club_a and d.points_a = f.points_b and d.points_b = f.points_a)));
  if detail is not null then raise exception 'Rencontres absentes ou différentes en base : %', detail; end if;

  -- 3. Chaque exempt concorde.
  select string_agg('J' || f.journee || ' ' || f.exempt, ' ; ') into detail
    from flbp_d2_2026 f
   where f.exempt is not null
     and not exists (select 1 from public.division_d2_resultats d
                      where d.saison = '2026' and d.journee = f.journee and d.exempt = f.exempt);
  if detail is not null then raise exception 'Exempts différents : %', detail; end if;

  -- 4. Rien de plus en base que dans le tableau : 14 × 4 lignes.
  select count(*) into n from public.division_d2_resultats where saison = '2026';
  if n <> 56 then raise exception '% lignes en base pour 2026 au lieu de 56.', n; end if;

  -- 5. Chaque journée couvre exactement les sept clubs, une fois chacun.
  select count(*) into n from (
    select journee from (
      select journee, club_a as club from public.division_d2_resultats where saison = '2026' and club_a is not null
      union all select journee, club_b from public.division_d2_resultats where saison = '2026' and club_b is not null
      union all select journee, exempt from public.division_d2_resultats where saison = '2026' and exempt is not null
    ) t group by journee having count(*) <> 7 or count(distinct club) <> 7
  ) x;
  if n > 0 then raise exception '% journée(s) ne couvrent pas exactement les sept clubs.', n; end if;

  -- 6. La rencontre de Mondorf concorde avec `rencontres_d2` (notre feuille).
  select count(*) into n
    from public.rencontres_d2 r
   where r.saison = '2026' and r.journee = 14
     and r.score_cm = 37 and r.score_adverse = 26 and r.club_adverse = 'KaBoule';
  if n <> 1 then raise exception 'J14 : la rencontre de Mondorf ne concorde pas avec rencontres_d2.'; end if;

  raise notice 'National D2 2026 : J14 complétée, les 14 journées concordent avec le tableau fédéral.';
end $$;
