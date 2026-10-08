-- Promotion 2026 — le nombre de « 4/4 » de chaque club à chaque journée (08/10/2026).
--
-- 0066 stockait le classement tel que publié par la fédération et ne pouvait pas
-- départager les journées sans classement publié : la règle du 4/4 n'était pas
-- connue. Elle l'est depuis le relevé des dix feuilles (journal du 08/10/2026) :
--
--   un « 4/4 » est une équipe qui gagne ses quatre parties ET dont le résultat
--   compte dans les points du club (la meilleure mixte, puis les deux
--   meilleures des autres). D'où au plus **trois** par club et par journée.
--
-- La colonne `quatre_quatre` porte ce nombre pour chaque club et chaque journée
-- **jouée** (133 valeurs, sur 589 équipes relevées) ; elle reste vide quand le
-- club n'a pas joué. Le cumul sert à départager les égalités de points aux
-- journées sans classement publié : J1 à J5, J7 et J9.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE LE RECOUPEMENT DIT, ET NE DIT PAS
-- ─────────────────────────────────────────────────────────────────────────
--
-- Les cumuls reconstitués retrouvent 38 des 42 compteurs publiés (J6, J8, J10 ×
-- 14 clubs). **Quatre s'en écartent, et la migration les nomme** plutôt que de
-- les absorber :
--
--   Boule d'Or, après J6, J8 et J10 : la fédération publie 2 de plus (5, 6, 6
--   contre 3, 4, 4). Les totaux de points de ce club retombent exactement sur
--   les feuilles : aucune équipe à quatre victoires ne manque au relevé.
--
--   Clair-Chêne, après J10 : la fédération publie 4, la reconstitution 5. En J10
--   l'équipe 4 gagne ses quatre parties et compte aux points, mais n'est pas
--   ajoutée au compteur.
--
-- On ne sait pas si ces compteurs fédéraux sont faux ou suivent un critère que
-- les feuilles ne montrent pas. `promotion_classement` (classements publiés)
-- n'est pas touchée : aux journées publiées, le rang reste celui de la FLBP.
--
-- Kayl a joué J1, J2 et J4 (0066) : ses trois valeurs sont à 0.

alter table public.promotion_resultats_club
  add column quatre_quatre integer;

alter table public.promotion_resultats_club
  add constraint promotion_resultats_club_quatre_quatre_check
  check (quatre_quatre is null or (jouee and quatre_quatre between 0 and 3));

comment on column public.promotion_resultats_club.quatre_quatre is
  'Équipes du club ayant gagné leurs quatre parties ET comptant dans ses points ce jour-là '
  '(0 à 3). Reconstitué sur les feuilles de journée, pas publié par la FLBP. Vide si le club n''a pas joué.';

with valeurs(journee, club, q) as (values
    (1, 'A Rifat Steinfort', 0),
    (1, 'B.P. Clair-Chêne Esch', 1),
    (1, 'Boule d''Or Esch', 1),
    (1, 'CBC Belvaux-Metzerlach', 0),
    (1, 'Carreau Mondorf', 1),
    (1, 'Club Bouliste Lasauvage', 0),
    (1, 'KaBoule', 0),
    (1, 'Péta-Boules Schifflange', 0),
    (1, 'Pétanque & Boules Kayl', 0),
    (1, 'Pétanque des Faubourgs', 0),
    (1, 'Riganelli Esch', 1),
    (1, 'Schierener Bullemettïen', 0),
    (1, 'Stenemer Bulls Steinheim', 0),
    (1, 'USBP Dudelange', 1),
    (2, 'A Rifat Steinfort', 0),
    (2, 'B.P. Clair-Chêne Esch', 1),
    (2, 'Boule d''Or Esch', 0),
    (2, 'CBC Belvaux-Metzerlach', 0),
    (2, 'Carreau Mondorf', 1),
    (2, 'Club Bouliste Lasauvage', 0),
    (2, 'KaBoule', 0),
    (2, 'Péta-Boules Schifflange', 0),
    (2, 'Pétanque & Boules Kayl', 0),
    (2, 'Pétanque des Faubourgs', 0),
    (2, 'Riganelli Esch', 2),
    (2, 'Schierener Bullemettïen', 0),
    (2, 'Stenemer Bulls Steinheim', 0),
    (2, 'USBP Dudelange', 0),
    (3, 'A Rifat Steinfort', 0),
    (3, 'B.P. Clair-Chêne Esch', 0),
    (3, 'Boule d''Or Esch', 0),
    (3, 'CBC Belvaux-Metzerlach', 0),
    (3, 'Carreau Mondorf', 0),
    (3, 'Club Bouliste Lasauvage', 0),
    (3, 'KaBoule', 0),
    (3, 'Péta-Boules Schifflange', 2),
    (3, 'Pétanque des Faubourgs', 0),
    (3, 'Riganelli Esch', 0),
    (3, 'Schierener Bullemettïen', 0),
    (3, 'Stenemer Bulls Steinheim', 0),
    (3, 'USBP Dudelange', 1),
    (4, 'A Rifat Steinfort', 0),
    (4, 'B.P. Clair-Chêne Esch', 0),
    (4, 'Boule d''Or Esch', 0),
    (4, 'CBC Belvaux-Metzerlach', 0),
    (4, 'Carreau Mondorf', 0),
    (4, 'Club Bouliste Lasauvage', 0),
    (4, 'KaBoule', 0),
    (4, 'Péta-Boules Schifflange', 2),
    (4, 'Pétanque & Boules Kayl', 0),
    (4, 'Pétanque des Faubourgs', 0),
    (4, 'Riganelli Esch', 0),
    (4, 'Schierener Bullemettïen', 0),
    (4, 'Stenemer Bulls Steinheim', 0),
    (4, 'USBP Dudelange', 0),
    (5, 'A Rifat Steinfort', 0),
    (5, 'B.P. Clair-Chêne Esch', 1),
    (5, 'Boule d''Or Esch', 0),
    (5, 'CBC Belvaux-Metzerlach', 0),
    (5, 'Carreau Mondorf', 0),
    (5, 'Club Bouliste Lasauvage', 0),
    (5, 'KaBoule', 1),
    (5, 'Péta-Boules Schifflange', 1),
    (5, 'Pétanque des Faubourgs', 0),
    (5, 'Riganelli Esch', 0),
    (5, 'Schierener Bullemettïen', 0),
    (5, 'Stenemer Bulls Steinheim', 0),
    (5, 'USBP Dudelange', 1),
    (6, 'A Rifat Steinfort', 0),
    (6, 'B.P. Clair-Chêne Esch', 0),
    (6, 'Boule d''Or Esch', 2),
    (6, 'CBC Belvaux-Metzerlach', 0),
    (6, 'Carreau Mondorf', 0),
    (6, 'Club Bouliste Lasauvage', 0),
    (6, 'KaBoule', 0),
    (6, 'Péta-Boules Schifflange', 0),
    (6, 'Pétanque des Faubourgs', 0),
    (6, 'Riganelli Esch', 0),
    (6, 'Schierener Bullemettïen', 0),
    (6, 'Stenemer Bulls Steinheim', 0),
    (6, 'USBP Dudelange', 2),
    (7, 'A Rifat Steinfort', 0),
    (7, 'B.P. Clair-Chêne Esch', 1),
    (7, 'Boule d''Or Esch', 1),
    (7, 'CBC Belvaux-Metzerlach', 0),
    (7, 'Carreau Mondorf', 0),
    (7, 'Club Bouliste Lasauvage', 0),
    (7, 'KaBoule', 0),
    (7, 'Péta-Boules Schifflange', 1),
    (7, 'Pétanque des Faubourgs', 0),
    (7, 'Riganelli Esch', 0),
    (7, 'Schierener Bullemettïen', 0),
    (7, 'Stenemer Bulls Steinheim', 0),
    (7, 'USBP Dudelange', 1),
    (8, 'A Rifat Steinfort', 0),
    (8, 'B.P. Clair-Chêne Esch', 0),
    (8, 'Boule d''Or Esch', 0),
    (8, 'CBC Belvaux-Metzerlach', 2),
    (8, 'Carreau Mondorf', 0),
    (8, 'Club Bouliste Lasauvage', 0),
    (8, 'KaBoule', 0),
    (8, 'Péta-Boules Schifflange', 0),
    (8, 'Pétanque des Faubourgs', 0),
    (8, 'Riganelli Esch', 0),
    (8, 'Schierener Bullemettïen', 1),
    (8, 'Stenemer Bulls Steinheim', 0),
    (8, 'USBP Dudelange', 0),
    (9, 'A Rifat Steinfort', 0),
    (9, 'B.P. Clair-Chêne Esch', 0),
    (9, 'Boule d''Or Esch', 0),
    (9, 'CBC Belvaux-Metzerlach', 0),
    (9, 'Carreau Mondorf', 0),
    (9, 'Club Bouliste Lasauvage', 0),
    (9, 'KaBoule', 0),
    (9, 'Péta-Boules Schifflange', 0),
    (9, 'Pétanque des Faubourgs', 0),
    (9, 'Riganelli Esch', 1),
    (9, 'Schierener Bullemettïen', 1),
    (9, 'Stenemer Bulls Steinheim', 0),
    (9, 'USBP Dudelange', 1),
    (10, 'A Rifat Steinfort', 0),
    (10, 'B.P. Clair-Chêne Esch', 1),
    (10, 'Boule d''Or Esch', 0),
    (10, 'CBC Belvaux-Metzerlach', 0),
    (10, 'Carreau Mondorf', 0),
    (10, 'Club Bouliste Lasauvage', 0),
    (10, 'KaBoule', 1),
    (10, 'Péta-Boules Schifflange', 0),
    (10, 'Pétanque des Faubourgs', 0),
    (10, 'Riganelli Esch', 0),
    (10, 'Schierener Bullemettïen', 0),
    (10, 'Stenemer Bulls Steinheim', 0),
    (10, 'USBP Dudelange', 2)
)
update public.promotion_resultats_club r
   set quatre_quatre = v.q
  from valeurs v
 where r.saison = '2026' and r.journee = v.journee and r.club = v.club;

-- ─────────────────────────────────────────────────────────────────────────
-- GARDE-FOUS — tout écart annule la migration entière
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  detail text;
  n integer;
begin
  -- a. Chaque journée jouée porte sa valeur, aucune journée non jouée n'en a.
  select count(*) into n
    from public.promotion_resultats_club
   where saison = '2026' and jouee and quatre_quatre is null;
  if n > 0 then raise exception '% journée(s) jouée(s) sans valeur de 4/4.', n; end if;

  select count(*) into n from public.promotion_resultats_club where saison = '2026' and jouee;
  if n <> 133 then raise exception '% journées jouées au lieu de 133.', n; end if;

  -- b. Le cumul reconstitué retrouve les compteurs publiés, sauf les quatre
  --    écarts nommés plus haut (écart = reconstitué − publié).
  with cumul as (
    select c.apres_journee, c.club, c.quatre_quatre as publie,
           (select coalesce(sum(r.quatre_quatre), 0) from public.promotion_resultats_club r
             where r.saison = c.saison and r.club = c.club and r.journee <= c.apres_journee) as reconstitue
      from public.promotion_classement c
     where c.saison = '2026'
  ),
  ecarts as (
    select apres_journee, club, reconstitue - publie as ecart from cumul where reconstitue <> publie
  ),
  attendus(apres_journee, club, ecart) as (values
    (6, 'Boule d''Or Esch', -2), (8, 'Boule d''Or Esch', -2), (10, 'Boule d''Or Esch', -2),
    (10, 'B.P. Clair-Chêne Esch', 1)
  )
  select string_agg('J' || coalesce(e.apres_journee, a.apres_journee) || ' ' || coalesce(e.club, a.club)
                    || ' (écart ' || coalesce(e.ecart::text, 'aucun') || ', attendu ' || coalesce(a.ecart::text, 'aucun') || ')', ', ')
    into detail
    from ecarts e
    full join attendus a on a.apres_journee = e.apres_journee and a.club = e.club
   where e.ecart is distinct from a.ecart;
  if detail is not null then raise exception '4/4 reconstitués ≠ publiés, hors écarts connus : %', detail; end if;

  -- c. LE recoupement : à chaque classement publié, l'ordre est « points, puis
  --    4/4 reconstitués » — aucun club n'est placé derrière un club qui le
  --    devance aux points, ou à points égaux au 4/4.
  select string_agg(distinct 'J' || a.apres_journee || ' ' || a.club || '/' || b.club, ', ') into detail
    from public.promotion_classement a
    join public.promotion_classement b on b.saison = a.saison and b.apres_journee = a.apres_journee
                                       and b.position > a.position
   where a.saison = '2026'
     and (b.points > a.points
          or (b.points = a.points
              and (select coalesce(sum(r.quatre_quatre), 0) from public.promotion_resultats_club r
                    where r.saison = b.saison and r.club = b.club and r.journee <= b.apres_journee)
                > (select coalesce(sum(r.quatre_quatre), 0) from public.promotion_resultats_club r
                    where r.saison = a.saison and r.club = a.club and r.journee <= a.apres_journee)));
  if detail is not null then raise exception 'Ordre publié ≠ points puis 4/4 : %', detail; end if;

  raise notice 'Promotion 2026 : 133 valeurs de 4/4 par club et par journée, recoupées aux classements publiés.';
end $$;
