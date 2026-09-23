-- Championnat Promotion 2026 — dépouillement des documents FLBP (23/09/2026).
--
-- `promotion_equipes` s'arrêtait à la saison 2025. La fédération a publié
-- entre-temps de quoi remplir une partie de 2026 — mais une partie
-- seulement, et il faut dire laquelle.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE LA FLBP A PUBLIÉ POUR 2026, ET CE QUE ÇA PERMET
-- ─────────────────────────────────────────────────────────────────────────
--
-- Inventaire fait le 23/09/2026 via la médiathèque WordPress du site
-- (`/wp-json/wp/v2/media?search=PROMO`), pas en devinant des URL :
--
--   PROMO-Resultats-6-scaled.png   (27/05) feuille complète, journée 6
--   PROMO-Classement-6.png         (27/05) classement après J6
--   PROMO-Classement-8.png         (21/07) classement après J8
--   PROMO-rect-…-Total-journees…   (21/07) points par club ET par journée
--   PROMO-Resultats-10-scaled.png  (14/09) feuille complète, journée 10
--   PROMO-Classement-10.png        (14/09) classement final, 10 journées
--
-- Deux feuilles de journée seulement : la 6 et la 10. Elles seules donnent
-- la composition des trios et les parties gagnées équipe par équipe — les
-- deux choses dont cette table a besoin. Les huit autres journées ne sont
-- connues qu'au niveau du club, en points, par le tableau « Total
-- Journées » : rien à en tirer ici, et on n'invente pas de trio.
--
-- ⚠️ La saison 2026 est donc **partielle dans cette table : 2 journées sur
-- 10**. Ce n'est pas un oubli, c'est la limite de la source. Le composant
-- `StatistiquesPromotion` l'affiche désormais explicitement, sans quoi un
-- licencié lirait « 1 journée jouée » et croirait à sa saison. La saison
-- 2025 était déjà dans ce cas (8 journées sur 10) sans que rien ne le dise.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LECTURE DES FEUILLES : (adversaire, score), pas (score, adversaire)
-- ─────────────────────────────────────────────────────────────────────────
--
-- Les huit colonnes de chiffres sont quatre paires. L'ordre n'est écrit
-- nulle part sur le document ; il a été établi, pas supposé :
--
--   · l'équipe 4 de la J10 lit « 2,13 · 15,13 · 23,13 · 26,13 » et porte 4
--     victoires. En (adversaire, score) elle gagne quatre fois 13 — juste.
--     En (score, adversaire) elle n'en gagnerait aucune.
--   · réciprocité vérifiée sur trois couples : l'équipe 3 marque 13 contre
--     la 25, et la 25 marque 12 contre la 3 → 13-12 des deux côtés. Idem
--     2↔24 (13-1) et 1↔19 (13-12).
--
-- `ex.` = exempt, compté comme une partie gagnée (13) — c'est ce que font
-- les totaux du document.
--
-- ─────────────────────────────────────────────────────────────────────────
-- DATES
-- ─────────────────────────────────────────────────────────────────────────
--
-- J6 = 17/05/2026, J10 = 06/09/2026. Les en-têtes de colonnes du tableau
-- « Total Journées » et `calendrier_federation` concordent sur neuf des dix
-- journées.
--
-- ⚠️ Écart isolé sur la **J5** : notre calendrier porte le 09/05, la
-- fédération le 10/05. Aucune des deux journées concernées n'est insérée
-- ici, donc rien à trancher dans cette migration — mais l'écart est réel et
-- reste à vérifier auprès du club.
--
-- ─────────────────────────────────────────────────────────────────────────
-- NOMS
-- ─────────────────────────────────────────────────────────────────────────
--
-- Graphie de la fédération, remise à la convention du projet « NOM Prénom »
-- (patronyme en capitales), comme les lignes 2025 déjà en base.
--
-- Les onze joueurs ont été rapprochés du registre `personnes` par la clé
-- insensible à l'ordre, à la casse et aux accents (`cle_nom_joueur`, 0061) :
-- **onze sur onze** correspondent à une fiche active. Aucun inconnu.
--
-- ⚠️ Un écart de graphie relevé au passage, non corrigé ici : le registre
-- porte « WALTE Daniellé », la fédération « Walte Danielle ». L'accent final
-- n'existe pas dans ce prénom ; c'est très probablement une coquille du
-- registre. Elle est sans effet sur les statistiques (`cleNomMajuscules`
-- ignore les accents), et corriger le prénom de quelqu'un sans le lui
-- demander serait la même faute qu'au 0063 pour BENNONI. À trancher avec
-- l'intéressée.

do $$
declare
  nb_existantes integer;
  parties_j6 integer;
  parties_j10 integer;
begin
  -- Idempotence : si ces journées sont déjà en base, on ne fait rien plutôt
  -- que de doubler les lignes. Aucune contrainte d'unicité ne l'empêcherait.
  select count(*) into nb_existantes
    from public.promotion_equipes
   where saison = '2026' and journee in (6, 10);

  if nb_existantes > 0 then
    raise notice 'Journées 6/10 de la saison 2026 déjà présentes (% lignes) — migration sans effet.', nb_existantes;
    return;
  end if;

  insert into public.promotion_equipes
    (source_id, saison, journee, date, numero_equipe, categorie, type, joueur_1, joueur_2, joueur_3, parties_gagnees)
  values
    -- Journée 6 — 17/05/2026, Promotion à Steinheim
    ('PROMO-FLBP-2026-J6-E40',  '2026',  6, '2026-05-17', 40, 'B', 'M',
     'BERTEMES Marco',  'FLAMMANG Marie-Jean', 'BACK Yves',        2),
    ('PROMO-FLBP-2026-J6-E41',  '2026',  6, '2026-05-17', 41, 'B', 'H',
     'MARION Stéphane', 'STEPHAN Sylvain',     'PORCU Bruno',      1),

    -- Journée 10 — 06/09/2026, Promotion au Clair-Chêne
    ('PROMO-FLBP-2026-J10-E1',  '2026', 10, '2026-09-06',  1, 'A', 'M',
     'MARION Stéphane', 'FLAMMANG Marie-Jean', 'MATHIS Claude',    2),
    ('PROMO-FLBP-2026-J10-E2',  '2026', 10, '2026-09-06',  2, 'A', 'M',
     'WALTE Claude',    'WALTE Danielle',      'HEISBOURG Nico',   1),
    ('PROMO-FLBP-2026-J10-E3',  '2026', 10, '2026-09-06',  3, 'B', 'H',
     'OLINGER Claude',  'PORCU Bruno',         'STEPHAN Sylvain',  2);

  -- Garde-fou : les totaux de club doivent retomber sur ceux publiés par la
  -- fédération, sinon une ligne a été mal lue et on annule tout.
  --
  --   J6  : 3 parties → 15 points. Colonne « 17/05/2026 » du tableau
  --         « Total Journées » : 15. Deux documents indépendants.
  --   J10 : 5 parties → 25 points. Cellule de total de la feuille J10 : 25.
  --         Recoupé autrement : 315 (classement final) − 270 (classement
  --         après J8) = 45 pour les J9 et J10 réunies, dont 25 ici.
  select coalesce(sum(parties_gagnees), -1) into parties_j6
    from public.promotion_equipes where saison = '2026' and journee = 6;
  select coalesce(sum(parties_gagnees), -1) into parties_j10
    from public.promotion_equipes where saison = '2026' and journee = 10;

  if parties_j6 <> 3 then
    raise exception 'J6 : % parties gagnées au lieu des 3 publiées (15 points) — insertion annulée.', parties_j6;
  end if;
  if parties_j10 <> 5 then
    raise exception 'J10 : % parties gagnées au lieu des 5 publiées (25 points) — insertion annulée.', parties_j10;
  end if;

  raise notice 'Promotion 2026 : 5 équipes insérées (J6 : 3 parties / 15 pts, J10 : 5 parties / 25 pts).';
end $$;
