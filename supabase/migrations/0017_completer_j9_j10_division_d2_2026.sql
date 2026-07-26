-- Complète division_d2_resultats (saison 2026) avec les journées 9 et 10,
-- absentes de la synchro initiale Google Sheet -> Supabase (v1 avait été
-- mise à jour via ajouterResultatsDivisionD2_J9J10_2026() dans
-- DivisionD2Backend.gs, jamais répliqué côté v2 : c'est la cause du bug
-- "nombre de journées incorrect" sur la page d'accueil).
-- Idempotent : ne fait rien si J9/J10 2026 existent déjà.

insert into division_d2_resultats (source_id, saison, journee, date, club_a, club_b, points_a, points_b, exempt)
select v.source_id, v.saison, v.journee, v.date::date, v.club_a, v.club_b, v.points_a, v.points_b, v.exempt
from (values
  ('DIVD2-J9J10-2026-1', '2026', 9, '2026-07-11', 'A Rifat Steinfort', 'Club Bouliste Lasauvage', 26, 37, null),
  ('DIVD2-J9J10-2026-2', '2026', 9, '2026-07-11', 'Schierener Bullemettïen', 'KaBoule', 27, 36, null),
  ('DIVD2-J9J10-2026-3', '2026', 9, '2026-07-11', 'CBC Belvaux-Metzerlach', 'Stenemer Bulls Steinheim', 47, 16, null),
  ('DIVD2-J9J10-2026-4', '2026', 9, '2026-07-11', null, null, null, null, 'Carreau Mondorf'),

  ('DIVD2-J9J10-2026-5', '2026', 10, '2026-07-18', 'Carreau Mondorf', 'Club Bouliste Lasauvage', 41, 22, null),
  ('DIVD2-J9J10-2026-6', '2026', 10, '2026-07-18', 'Stenemer Bulls Steinheim', 'Schierener Bullemettïen', 42, 21, null),
  ('DIVD2-J9J10-2026-7', '2026', 10, '2026-07-19', 'KaBoule', 'A Rifat Steinfort', 32, 31, null),
  ('DIVD2-J9J10-2026-8', '2026', 10, '2026-07-19', null, null, null, null, 'CBC Belvaux-Metzerlach')
) as v(source_id, saison, journee, date, club_a, club_b, points_a, points_b, exempt)
where not exists (
  select 1 from division_d2_resultats
  where saison = '2026' and journee in (9, 10)
);
