-- 0077_tournoi_participant_club.sql — Le club lu dans la feuille d'équipes (10/11/2026)
--
-- Constat : la feuille de constitution des équipes du tournoi 43 portait une
-- colonne « Club » (une valeur par équipe, parfois deux : « Kayl / Mondorf »).
-- L'import ne lisait que les noms et le numéro d'équipe : les clubs étaient
-- perdus sans un mot, alors que le tirage de la 1re partie en a besoin pour ne
-- pas opposer deux équipes du même club.
--
-- Le club d'une équipe se rattache à ses joueurs (`tournoi_participants`), pas
-- à l'équipe : les équipes permanentes sont supprimées et recréées chaque fois
-- que la composition change, les participants, eux, survivent. À la création
-- d'une équipe, son club est déduit de ceux de ses membres.
--
-- Colonne facultative : rien ne change pour les tournois existants ni pour la
-- mêlée. La politique RLS « CA tournoi_participants » (FOR ALL) la couvre déjà.

alter table tournoi_participants add column if not exists club text;

comment on column tournoi_participants.club is
  'Club tel que lu dans la feuille d''équipes (« Belvaux », « Kayl / Mondorf »). Sert à composer le club des équipes permanentes.';
