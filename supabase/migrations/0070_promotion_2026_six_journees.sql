-- Promotion 2026 — six feuilles de journée supplémentaires (23/09/2026).
--
-- Jérôme transmet les feuilles des journées 1, 2, 3, 4, 7 et 9 : « adapte
-- les données, les statistiques, les résultats de tous ». Avec J6 et J10
-- (0065), la saison est connue équipe par équipe sur **8 journées sur 10** ;
-- manquent J5 et J8.
--
-- ─────────────────────────────────────────────────────────────────────────
-- COMMENT LE RELEVÉ A ÉTÉ VÉRIFIÉ
-- ─────────────────────────────────────────────────────────────────────────
--
-- Les 368 équipes des six feuilles ont été relevées, tous clubs confondus —
-- mais seules celles de Mondorf entrent en base, et **jamais le nom d'un
-- joueur adverse** (règle de 0064). Les autres ont servi à vérifier :
--
--   · réciprocité : chaque partie A→B au tour t doit retrouver B→A au même
--     tour, avec un seul vainqueur ;
--   · parties gagnées recomptées = colonne « parties gagnées » de la feuille ;
--   · total de chaque club = points déjà en base (tableau fédéral « Total
--     Journées » et classements, 0066) : **81 totaux de club sur 81**.
--
-- Sept incohérences subsistent : toutes sont **sur les feuilles**, vérifiées
-- au zoom. Une seule touche Mondorf (J9, ci-dessous) ; les six autres sont
-- des numéros d'adversaire mal saisis chez d'autres clubs (J3 : Faubourgs 34
-- et Schieren 50 ; J4 : KaBoule 41, qui se désigne lui-même, et Schifflange
-- 23 ; J9 : Schieren 36), plus une partie J3 Clair-Chêne 24 – Schifflange 58
-- notée 12-11 et comptée perdue par les deux camps. Aucune ne change un total
-- de club.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LA RÈGLE DE SCORE, CORRIGÉE
-- ─────────────────────────────────────────────────────────────────────────
--
-- 0066 notait « un club marque avec ses trois meilleures équipes ». C'était
-- vrai sur J6 et J10, faux en général : **un club marque avec trois équipes
-- dont au moins une mixte (M)** — la meilleure mixte, puis les deux
-- meilleures parmi les autres. Les deux règles ne divergent que deux fois sur
-- les six feuilles, et la seconde tombe juste les deux fois :
--
--   J1 Schifflange : équipes H2 M2 H3 H3 H2 H3 → 45 aux trois meilleures,
--                    40 avec une mixte ; la fédération dit 40.
--   J4 Schifflange : H2 H4 H4 M2 H4 H3 H3 → 60 contre 50 ; la fédération
--                    dit 50.
--
-- Même vérification pour Mondorf, sur ses huit journées, dans les garde-fous
-- ci-dessous.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LA J9 N'EST PLUS DÉDUITE
-- ─────────────────────────────────────────────────────────────────────────
--
-- 0066 avait reconstitué les points de la J9 par différence entre deux
-- classements publiés. La feuille J9 porte les totaux de club : **les
-- quatorze valeurs déduites étaient exactes**. Elles passent `deduit = false`,
-- et le garde-fou compare chacune au total lu sur la feuille.
--
-- ─────────────────────────────────────────────────────────────────────────
-- NOMS
-- ─────────────────────────────────────────────────────────────────────────
--
-- Graphie déjà en base quand le joueur y figure (les statistiques regroupent
-- par nom), sinon celle du registre. Deux joueurs absents du registre :
-- **DUBLIN Jos** (J3) et **SZCZUCKI Bernard** (J7, déjà présent dans les
-- données 2025). Laissés tels quels — à rattacher par Jérôme s'ils sont
-- licenciés du club.
--
-- ⚠️ La feuille J9 porte en tête une ligne de J8 pour Mondorf (BERTEMES,
-- FLAMMANG, MARTINS Tun, 3 parties gagnées). **Non insérée** : une seule
-- équipe sur celles du club ce jour-là ferait passer la J8 pour connue, et
-- ses adversaires ne sont vérifiables sur aucune feuille.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. LA PARTIE GAGNÉE AU TEMPS
-- ─────────────────────────────────────────────────────────────────────────
--
-- Une partie peut s'arrêter au temps : le vainqueur n'a pas 13. Les feuilles
-- l'écrivent « 11(g) ». Mondorf en a une (J4, équipe 7, tour 4 : 11-8), et
-- `promotion_parties` ne savait pas la représenter — `gagnee` y était
-- calculée comme `score_cm = 13`, et la contrainte exigeait un camp à 13.

alter table public.promotion_parties add column au_temps boolean not null default false;

alter table public.promotion_parties drop column gagnee;
alter table public.promotion_parties add column gagnee boolean generated always as (
  case
    when exempt then true
    when au_temps then score_cm > coalesce(score_adverse, 0)
    else score_cm = 13
  end
) stored;

alter table public.promotion_parties drop constraint promotion_parties_check;
alter table public.promotion_parties add constraint promotion_parties_check check (
  (exempt and not au_temps and adversaire_club is null and adversaire_numero_equipe is null
     and score_cm = 13 and score_adverse is null)
  or
  (not exempt and adversaire_club is not null and score_adverse is not null
     and score_cm <> score_adverse
     and (
       (not au_temps and (score_cm = 13) <> (score_adverse = 13))
       or (au_temps and score_cm < 13 and score_adverse < 13)
     ))
);

do $$
begin
  if exists (select 1 from public.promotion_equipes
              where saison = '2026' and journee in (1, 2, 3, 4, 7, 9)) then
    raise exception 'Des trios existent déjà pour ces journées — migration annulée plutôt que doublée.';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. LES 27 TRIOS DE MONDORF (J1, J2, J3, J4, J7, J9)
-- ─────────────────────────────────────────────────────────────────────────

insert into public.promotion_equipes
  (source_id, saison, journee, date, numero_equipe, categorie, type, joueur_1, joueur_2, joueur_3, parties_gagnees)
values
    ('PROMO-FLBP-2026-J1-E45', '2026', 1, '2026-04-12', 45, 'B', 'H', 'STEPHAN Sylvain', 'HEISBOURG Nico', 'PORCU Bruno', 2),
    ('PROMO-FLBP-2026-J1-E46', '2026', 1, '2026-04-12', 46, 'B', 'H', 'SALVAN Thierry', 'TIHY Cyrille', 'BEGUE Yann', 3),
    ('PROMO-FLBP-2026-J1-E47', '2026', 1, '2026-04-12', 47, 'A', 'H', 'OLINGER Claude', 'MATHIS Claude', 'BRAVACCINI John', 0),
    ('PROMO-FLBP-2026-J1-E48', '2026', 1, '2026-04-12', 48, 'B', 'M', 'FLAMMANG Marie-Jean', 'BACK Yves', 'BERTEMES Marco', 4),
    ('PROMO-FLBP-2026-J2-E1', '2026', 2, '2026-04-19', 1, 'A', 'H', 'TIHY Cyrille', 'LE BERRE Yann', 'ROUSSET Dominique', 2),
    ('PROMO-FLBP-2026-J2-E2', '2026', 2, '2026-04-19', 2, 'A', 'H', 'HEISBOURG Nico', 'WALTE Claude', 'SCHOMER Jean-Marie', 1),
    ('PROMO-FLBP-2026-J2-E3', '2026', 2, '2026-04-19', 3, 'A', 'M', 'BEGUE Yann', 'SCHMIT Marie-Louise', 'WALTE Danielle', 1),
    ('PROMO-FLBP-2026-J2-E4', '2026', 2, '2026-04-19', 4, 'B', 'M', 'OLINGER Claude', 'PORCU Bruno', 'STEPHAN Sylvain', 2),
    ('PROMO-FLBP-2026-J2-E5', '2026', 2, '2026-04-19', 5, 'B', 'M', 'BERTEMES Marco', 'FLAMMANG Marie-Jean', 'BACK Yves', 4),
    ('PROMO-FLBP-2026-J3-E1', '2026', 3, '2026-04-25', 1, 'B', 'H', 'DUBLIN Jos', 'LECLERC Hubert', 'SALVAN Thierry', 2),
    ('PROMO-FLBP-2026-J3-E2', '2026', 3, '2026-04-25', 2, 'B', 'H', 'BACK Yves', 'DEPARIS Jean', 'HEISBOURG Nico', 1),
    ('PROMO-FLBP-2026-J3-E3', '2026', 3, '2026-04-25', 3, 'A', 'M', 'KÄPPELE Stefanie', 'MATHIS Claude', 'SCHOMER Jean-Marie', 1),
    ('PROMO-FLBP-2026-J3-E4', '2026', 3, '2026-04-25', 4, 'B', 'M', 'MARION Stéphane', 'PORCU Bruno', 'SALVAN Jocelyne', 1),
    ('PROMO-FLBP-2026-J3-E5', '2026', 3, '2026-04-25', 5, 'A', 'M', 'OLINGER Claude', 'WALTE Danielle', 'WALTE Claude', 1),
    ('PROMO-FLBP-2026-J4-E5', '2026', 4, '2026-05-02', 5, 'A', 'M', 'PRYBYLA Jeanine', 'PRYBYLA Michel', 'DOYEN Jérôme', 1),
    ('PROMO-FLBP-2026-J4-E6', '2026', 4, '2026-05-02', 6, 'A', 'M', 'WALTE Danielle', 'HEISBOURG Nico', 'LECLERC Hubert', 2),
    ('PROMO-FLBP-2026-J4-E7', '2026', 4, '2026-05-02', 7, 'B', 'H', 'BACK Yves', 'BERTEMES Marco', 'MATHIS Claude', 2),
    ('PROMO-FLBP-2026-J4-E8', '2026', 4, '2026-05-02', 8, 'B', 'H', 'SALVAN Thierry', 'MARION Stéphane', 'WALTE Claude', 3),
    ('PROMO-FLBP-2026-J4-E9', '2026', 4, '2026-05-02', 9, 'B', 'H', 'STEPHAN Sylvain', 'OLINGER Claude', 'PORCU Bruno', 3),
    ('PROMO-FLBP-2026-J7-E1', '2026', 7, '2026-07-05', 1, 'B', 'M', 'BERTEMES Marco', 'FLAMMANG Marie-Jean', 'BACK Yves', 2),
    ('PROMO-FLBP-2026-J7-E2', '2026', 7, '2026-07-05', 2, 'A', 'M', 'MARION Stéphane', 'HEISBOURG Nico', 'KÄPPELE Stefanie', 2),
    ('PROMO-FLBP-2026-J7-E3', '2026', 7, '2026-07-05', 3, 'B', 'H', 'OLINGER Claude', 'PORCU Bruno', 'STEPHAN Sylvain', 2),
    ('PROMO-FLBP-2026-J7-E4', '2026', 7, '2026-07-05', 4, 'A', 'M', 'WALTE Claude', 'WALTE Danielle', 'SZCZUCKI Bernard', 0),
    ('PROMO-FLBP-2026-J9-E1', '2026', 9, '2026-08-30', 1, 'A', 'M', 'BERTEMES Marco', 'FLAMMANG Marie-Jean', 'STORONI Marc', 2),
    ('PROMO-FLBP-2026-J9-E2', '2026', 9, '2026-08-30', 2, 'B', 'M', 'WALTE Claude', 'WALTE Danielle', 'SALVAN Thierry', 1),
    ('PROMO-FLBP-2026-J9-E3', '2026', 9, '2026-08-30', 3, 'B', 'H', 'OLINGER Claude', 'PORCU Bruno', 'STEPHAN Sylvain', 1),
    ('PROMO-FLBP-2026-J9-E4', '2026', 9, '2026-08-30', 4, 'B', 'H', 'MATHIS Claude', 'HEISBOURG Nico', 'BACK Yves', 1);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. LEURS 108 PARTIES
-- ─────────────────────────────────────────────────────────────────────────

with parties(source_equipe, numero, exempt, au_temps, adversaire_club, adversaire_no, score_cm, score_adverse) as (values
    ('PROMO-FLBP-2026-J1-E45', 1, false, false, 'Schierener Bullemettïen', 56, 8, 13),
    ('PROMO-FLBP-2026-J1-E45', 2, false, false, 'Schierener Bullemettïen', 49, 13, 6),
    ('PROMO-FLBP-2026-J1-E45', 3, false, false, 'KaBoule', 10, 3, 13),
    ('PROMO-FLBP-2026-J1-E45', 4, false, false, 'Stenemer Bulls Steinheim', 41, 13, 1),
    ('PROMO-FLBP-2026-J1-E46', 1, false, false, 'Stenemer Bulls Steinheim', 43, 13, 7),
    ('PROMO-FLBP-2026-J1-E46', 2, false, false, 'KaBoule', 10, 6, 13),
    ('PROMO-FLBP-2026-J1-E46', 3, false, false, 'Club Bouliste Lasauvage', 30, 13, 5),
    ('PROMO-FLBP-2026-J1-E46', 4, false, false, 'Schierener Bullemettïen', 56, 13, 4),
    ('PROMO-FLBP-2026-J1-E47', 1, false, false, 'USBP Dudelange', 7, 3, 13),
    ('PROMO-FLBP-2026-J1-E47', 2, false, false, 'Schierener Bullemettïen', 50, 5, 13),
    ('PROMO-FLBP-2026-J1-E47', 3, false, false, 'Stenemer Bulls Steinheim', 41, 6, 13),
    ('PROMO-FLBP-2026-J1-E47', 4, false, false, 'A Rifat Steinfort', 62, 1, 13),
    ('PROMO-FLBP-2026-J1-E48', 1, false, false, 'USBP Dudelange', 5, 13, 11),
    ('PROMO-FLBP-2026-J1-E48', 2, false, false, 'Boule d''Or Esch', 20, 13, 9),
    ('PROMO-FLBP-2026-J1-E48', 3, false, false, 'Péta-Boules Schifflange', 27, 13, 7),
    ('PROMO-FLBP-2026-J1-E48', 4, false, false, 'Club Bouliste Lasauvage', 29, 13, 7),
    ('PROMO-FLBP-2026-J2-E1', 1, false, false, 'Club Bouliste Lasauvage', 47, 9, 13),
    ('PROMO-FLBP-2026-J2-E1', 2, false, false, 'Stenemer Bulls Steinheim', 50, 7, 13),
    ('PROMO-FLBP-2026-J2-E1', 3, false, false, 'CBC Belvaux-Metzerlach', 21, 13, 7),
    ('PROMO-FLBP-2026-J2-E1', 4, false, false, 'Pétanque des Faubourgs', 29, 13, 8),
    ('PROMO-FLBP-2026-J2-E2', 1, false, false, 'Stenemer Bulls Steinheim', 49, 8, 13),
    ('PROMO-FLBP-2026-J2-E2', 2, false, false, 'KaBoule', 39, 7, 13),
    ('PROMO-FLBP-2026-J2-E2', 3, false, false, 'Pétanque & Boules Kayl', 38, 12, 13),
    ('PROMO-FLBP-2026-J2-E2', 4, true, false, null, null, 13, null),
    ('PROMO-FLBP-2026-J2-E3', 1, false, false, 'Schierener Bullemettïen', 15, 8, 13),
    ('PROMO-FLBP-2026-J2-E3', 2, false, false, 'USBP Dudelange', 65, 12, 13),
    ('PROMO-FLBP-2026-J2-E3', 3, false, false, 'B.P. Clair-Chêne Esch', 11, 8, 13),
    ('PROMO-FLBP-2026-J2-E3', 4, false, false, 'Club Bouliste Lasauvage', 46, 13, 8),
    ('PROMO-FLBP-2026-J2-E4', 1, false, false, 'A Rifat Steinfort', 6, 4, 13),
    ('PROMO-FLBP-2026-J2-E4', 2, false, false, 'Pétanque des Faubourgs', 27, 13, 9),
    ('PROMO-FLBP-2026-J2-E4', 3, false, false, 'Boule d''Or Esch', 56, 2, 13),
    ('PROMO-FLBP-2026-J2-E4', 4, false, false, 'Stenemer Bulls Steinheim', 50, 13, 1),
    ('PROMO-FLBP-2026-J2-E5', 1, false, false, 'KaBoule', 39, 13, 7),
    ('PROMO-FLBP-2026-J2-E5', 2, false, false, 'Schierener Bullemettïen', 16, 13, 0),
    ('PROMO-FLBP-2026-J2-E5', 3, false, false, 'Club Bouliste Lasauvage', 45, 13, 11),
    ('PROMO-FLBP-2026-J2-E5', 4, false, false, 'CBC Belvaux-Metzerlach', 26, 13, 3),
    ('PROMO-FLBP-2026-J3-E1', 1, false, false, 'B.P. Clair-Chêne Esch', 28, 13, 10),
    ('PROMO-FLBP-2026-J3-E1', 2, false, false, 'Péta-Boules Schifflange', 60, 8, 13),
    ('PROMO-FLBP-2026-J3-E1', 3, false, false, 'Schierener Bullemettïen', 50, 1, 13),
    ('PROMO-FLBP-2026-J3-E1', 4, false, false, 'A Rifat Steinfort', 20, 13, 9),
    ('PROMO-FLBP-2026-J3-E2', 1, false, false, 'KaBoule', 66, 7, 13),
    ('PROMO-FLBP-2026-J3-E2', 2, false, false, 'Riganelli Esch', 46, 3, 13),
    ('PROMO-FLBP-2026-J3-E2', 3, false, false, 'Schierener Bullemettïen', 52, 13, 12),
    ('PROMO-FLBP-2026-J3-E2', 4, false, false, 'Schierener Bullemettïen', 54, 12, 13),
    ('PROMO-FLBP-2026-J3-E3', 1, false, false, 'Boule d''Or Esch', 14, 5, 13),
    ('PROMO-FLBP-2026-J3-E3', 2, false, false, 'B.P. Clair-Chêne Esch', 24, 2, 13),
    ('PROMO-FLBP-2026-J3-E3', 3, false, false, 'B.P. Clair-Chêne Esch', 28, 12, 13),
    ('PROMO-FLBP-2026-J3-E3', 4, false, false, 'Schierener Bullemettïen', 52, 13, 9),
    ('PROMO-FLBP-2026-J3-E4', 1, false, false, 'Péta-Boules Schifflange', 57, 11, 13),
    ('PROMO-FLBP-2026-J3-E4', 2, false, false, 'Pétanque des Faubourgs', 35, 13, 1),
    ('PROMO-FLBP-2026-J3-E4', 3, false, false, 'CBC Belvaux-Metzerlach', 10, 6, 13),
    ('PROMO-FLBP-2026-J3-E4', 4, false, false, 'B.P. Clair-Chêne Esch', 24, 12, 13),
    ('PROMO-FLBP-2026-J3-E5', 1, false, false, 'B.P. Clair-Chêne Esch', 23, 12, 13),
    ('PROMO-FLBP-2026-J3-E5', 2, false, false, 'Stenemer Bulls Steinheim', 43, 10, 13),
    ('PROMO-FLBP-2026-J3-E5', 3, false, false, 'Stenemer Bulls Steinheim', 39, 12, 13),
    ('PROMO-FLBP-2026-J3-E5', 4, false, false, 'CBC Belvaux-Metzerlach', 11, 13, 12),
    ('PROMO-FLBP-2026-J4-E5', 1, false, false, 'Riganelli Esch', 31, 12, 13),
    ('PROMO-FLBP-2026-J4-E5', 2, false, false, 'Stenemer Bulls Steinheim', 47, 13, 6),
    ('PROMO-FLBP-2026-J4-E5', 3, false, false, 'Péta-Boules Schifflange', 22, 8, 13),
    ('PROMO-FLBP-2026-J4-E5', 4, false, false, 'USBP Dudelange', 15, 9, 13),
    ('PROMO-FLBP-2026-J4-E6', 1, false, false, 'KaBoule', 40, 13, 9),
    ('PROMO-FLBP-2026-J4-E6', 2, false, false, 'Schierener Bullemettïen', 57, 13, 6),
    ('PROMO-FLBP-2026-J4-E6', 3, false, false, 'Péta-Boules Schifflange', 26, 4, 13),
    ('PROMO-FLBP-2026-J4-E6', 4, false, false, 'Schierener Bullemettïen', 54, 1, 13),
    ('PROMO-FLBP-2026-J4-E7', 1, false, false, 'Schierener Bullemettïen', 55, 4, 13),
    ('PROMO-FLBP-2026-J4-E7', 2, true, false, null, null, 13, null),
    ('PROMO-FLBP-2026-J4-E7', 3, false, false, 'USBP Dudelange', 19, 0, 13),
    ('PROMO-FLBP-2026-J4-E7', 4, false, true, 'Boule d''Or Esch', 34, 11, 8),
    ('PROMO-FLBP-2026-J4-E8', 1, false, false, 'Péta-Boules Schifflange', 25, 13, 9),
    ('PROMO-FLBP-2026-J4-E8', 2, false, false, 'USBP Dudelange', 21, 13, 7),
    ('PROMO-FLBP-2026-J4-E8', 3, false, false, 'USBP Dudelange', 18, 9, 13),
    ('PROMO-FLBP-2026-J4-E8', 4, false, false, 'Péta-Boules Schifflange', 22, 13, 8),
    ('PROMO-FLBP-2026-J4-E9', 1, false, false, 'Boule d''Or Esch', 37, 13, 6),
    ('PROMO-FLBP-2026-J4-E9', 2, false, false, 'Schierener Bullemettïen', 53, 2, 13),
    ('PROMO-FLBP-2026-J4-E9', 3, false, false, 'Péta-Boules Schifflange', 25, 13, 7),
    ('PROMO-FLBP-2026-J4-E9', 4, false, false, 'Schierener Bullemettïen', 52, 13, 9),
    ('PROMO-FLBP-2026-J7-E1', 1, false, false, 'KaBoule', 58, 13, 2),
    ('PROMO-FLBP-2026-J7-E1', 2, false, false, 'Schierener Bullemettïen', 5, 10, 13),
    ('PROMO-FLBP-2026-J7-E1', 3, false, false, 'USBP Dudelange', 23, 13, 5),
    ('PROMO-FLBP-2026-J7-E1', 4, false, false, 'Stenemer Bulls Steinheim', 47, 7, 13),
    ('PROMO-FLBP-2026-J7-E2', 1, false, false, 'CBC Belvaux-Metzerlach', 15, 13, 5),
    ('PROMO-FLBP-2026-J7-E2', 2, false, false, 'Schierener Bullemettïen', 7, 3, 13),
    ('PROMO-FLBP-2026-J7-E2', 3, false, false, 'B.P. Clair-Chêne Esch', 29, 10, 13),
    ('PROMO-FLBP-2026-J7-E2', 4, false, false, 'KaBoule', 54, 13, 12),
    ('PROMO-FLBP-2026-J7-E3', 1, false, false, 'Stenemer Bulls Steinheim', 45, 1, 13),
    ('PROMO-FLBP-2026-J7-E3', 2, false, false, 'Club Bouliste Lasauvage', 31, 12, 13),
    ('PROMO-FLBP-2026-J7-E3', 3, false, false, 'Schierener Bullemettïen', 9, 13, 12),
    ('PROMO-FLBP-2026-J7-E3', 4, false, false, 'Boule d''Or Esch', 34, 13, 12),
    ('PROMO-FLBP-2026-J7-E4', 1, false, false, 'CBC Belvaux-Metzerlach', 19, 6, 13),
    ('PROMO-FLBP-2026-J7-E4', 2, false, false, 'Riganelli Esch', 51, 3, 13),
    ('PROMO-FLBP-2026-J7-E4', 3, false, false, 'Pétanque des Faubourgs', 27, 10, 13),
    ('PROMO-FLBP-2026-J7-E4', 4, false, false, 'CBC Belvaux-Metzerlach', 16, 8, 13),
    ('PROMO-FLBP-2026-J9-E1', 1, false, false, 'Péta-Boules Schifflange', 27, 13, 12),
    ('PROMO-FLBP-2026-J9-E1', 2, false, false, 'Stenemer Bulls Steinheim', 33, 13, 8),
    ('PROMO-FLBP-2026-J9-E1', 3, false, false, 'Schierener Bullemettïen', 34, 4, 13),
    ('PROMO-FLBP-2026-J9-E1', 4, false, false, 'Riganelli Esch', 25, 1, 13),
    ('PROMO-FLBP-2026-J9-E2', 1, false, false, 'Péta-Boules Schifflange', 26, 13, 10),
    ('PROMO-FLBP-2026-J9-E2', 2, false, false, 'Schierener Bullemettïen', 35, 8, 13),
    ('PROMO-FLBP-2026-J9-E2', 3, false, false, 'Péta-Boules Schifflange', 27, 6, 13),
    ('PROMO-FLBP-2026-J9-E2', 4, false, false, 'USBP Dudelange', 44, 8, 13),
    ('PROMO-FLBP-2026-J9-E3', 1, false, false, 'Boule d''Or Esch', 16, 13, 7),
    ('PROMO-FLBP-2026-J9-E3', 2, false, false, 'Club Bouliste Lasauvage', 22, 6, 13),
    ('PROMO-FLBP-2026-J9-E3', 3, false, false, 'Schierener Bullemettïen', 39, 11, 13),
    ('PROMO-FLBP-2026-J9-E3', 4, false, false, 'Stenemer Bulls Steinheim', 33, 6, 13),
    ('PROMO-FLBP-2026-J9-E4', 1, false, false, 'Schierener Bullemettïen', 38, 13, 10),
    ('PROMO-FLBP-2026-J9-E4', 2, false, false, 'CBC Belvaux-Metzerlach', 11, 8, 13),
    ('PROMO-FLBP-2026-J9-E4', 3, false, false, 'B.P. Clair-Chêne Esch', 6, 12, 13),
    ('PROMO-FLBP-2026-J9-E4', 4, false, false, 'Péta-Boules Schifflange', 28, 6, 13)
)
insert into public.promotion_parties
  (equipe_id, numero, exempt, au_temps, adversaire_club, adversaire_numero_equipe, score_cm, score_adverse)
select e.id, p.numero, p.exempt, p.au_temps, p.adversaire_club, p.adversaire_no, p.score_cm, p.score_adverse
from parties p join public.promotion_equipes e on e.source_id = p.source_equipe;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. LA J9, CONFIRMÉE PAR SA FEUILLE
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare detail text;
begin
  -- Totaux de club lus sur la feuille J9 (colonne « Total »). Kayl n'a pas joué.
  with feuille(club, points) as (values
    ('Carreau Mondorf', 20), ('B.P. Clair-Chêne Esch', 25), ('A Rifat Steinfort', 45),
    ('CBC Belvaux-Metzerlach', 30), ('Boule d''Or Esch', 30), ('Pétanque des Faubourgs', 5),
    ('Club Bouliste Lasauvage', 15), ('Riganelli Esch', 35), ('Péta-Boules Schifflange', 40),
    ('Stenemer Bulls Steinheim', 20), ('Schierener Bullemettïen', 50), ('USBP Dudelange', 45),
    ('KaBoule', 20)
  )
  select string_agg(r.club || ' (' || coalesce(r.points::text, 'absent') || ' en base, '
                    || coalesce(f.points::text, 'absent') || ' sur la feuille)', ', ') into detail
    from public.promotion_resultats_club r
    full join feuille f on f.club = r.club
   where r.saison = '2026' and r.journee = 9
     and r.points is distinct from f.points;
  if detail is not null then
    raise exception 'J9 : points déduits ≠ feuille : %', detail;
  end if;

  update public.promotion_resultats_club set deduit = false where saison = '2026' and journee = 9;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. GARDE-FOUS — tout écart annule la migration entière
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  detail text;
  n integer;
begin
  -- a. Chaque trio de la saison a exactement ses quatre parties.
  select string_agg(e.source_id, ', ') into detail
    from public.promotion_equipes e
   where e.saison = '2026'
     and (select count(*) from public.promotion_parties p where p.equipe_id = e.id) <> 4;
  if detail is not null then raise exception 'Trios sans leurs quatre parties : %', detail; end if;

  -- b. Parties gagnées recomptées (au temps compris) = bilan du trio.
  select string_agg(e.source_id, ', ') into detail
    from public.promotion_equipes e
   where e.saison = '2026'
     and e.parties_gagnees <> (select count(*) from public.promotion_parties p
                                where p.equipe_id = e.id and p.gagnee);
  if detail is not null then raise exception 'Parties gagnées ≠ bilan du trio : %', detail; end if;

  -- c. Clubs adverses connus du classement de la saison.
  select count(*) into n
    from public.promotion_parties p join public.promotion_equipes e on e.id = p.equipe_id
   where e.saison = '2026' and not p.exempt
     and not exists (select 1 from public.promotion_classement c
                      where c.saison = e.saison and c.club = p.adversaire_club);
  if n > 0 then raise exception '% partie(s) avec un club adverse inconnu.', n; end if;

  -- d. LE recoupement : pour chaque journée connue, les trios de Mondorf
  --    redonnent les points du club selon la règle « trois équipes dont au
  --    moins une mixte » — deux sources indépendantes, les feuilles d'un côté,
  --    le tableau fédéral et les classements de l'autre.
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
  if n <> 8 then raise exception '% journées couvertes au lieu de 8.', n; end if;

  raise notice 'Promotion 2026 : 27 trios et 108 parties ajoutés, 8 journées sur 10 couvertes, J9 confirmée.';
end $$;
