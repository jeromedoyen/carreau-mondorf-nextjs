-- Promotion — le détail des parties des trios de Carreau Mondorf
-- (23/09/2026, demande de Jérôme : « crée les statistiques individuelles »).
--
-- `promotion_equipes` s'arrêtait au bilan du trio par journée : « 2 parties
-- gagnées sur 4 ». Les feuilles de journée de la FLBP disent bien plus — pour
-- chaque partie, l'équipe adverse et le score. C'est ce qui manquait au
-- module Promotion pour offrir ce que le National D2 offre déjà : le détail
-- partie par partie sous chaque joueur, avec l'adversaire et le score.
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QU'ON STOCKE, ET CE QU'ON NE STOCKE PAS
-- ─────────────────────────────────────────────────────────────────────────
--
-- Une ligne par partie d'un trio de Mondorf : numéro de la partie (1 à 4),
-- club adverse, numéro d'équipe adverse sur la feuille, nos points, les
-- leurs. **Jamais le nom des joueurs adverses** — ce sont des personnes
-- d'autres clubs, sans lien avec cette application (même règle qu'en 0064
-- pour `rencontres_d2.notes`). Le numéro d'équipe suffit à retrouver la
-- ligne sur la feuille fédérale si besoin.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LECTURE, VÉRIFIÉE PAR RÉCIPROCITÉ
-- ─────────────────────────────────────────────────────────────────────────
--
-- Une feuille ne donne, sur la ligne d'une équipe, que SON score à chaque
-- partie. Le score adverse se lit sur la ligne de l'adversaire. Les vingt
-- parties ci-dessous ont été relevées des deux côtés : à chaque fois, la
-- ligne adverse cite bien notre numéro d'équipe à la même partie, et l'un
-- des deux camps est à 13. Exemple, J10 : l'équipe 3 marque 13 contre la 25
-- en partie 1 ; la 25 marque 12 contre la 3 en partie 1 → 13-12.
--
-- `ex.` = exempt : la partie est comptée gagnée 13 à rien, comme le fait la
-- fédération dans ses totaux. `score_adverse` reste nul — il n'y a pas eu
-- d'adversaire.
--
-- Rattachement au trio par `source_id` (0065), pas par `id` : un identifiant
-- généré n'a pas sa place dans un fichier de migration.

create table public.promotion_parties (
  id bigint generated always as identity primary key,
  equipe_id bigint not null references public.promotion_equipes (id) on delete cascade,
  numero integer not null check (numero between 1 and 4),
  exempt boolean not null default false,
  adversaire_club text,
  adversaire_numero_equipe integer,
  score_cm integer not null check (score_cm between 0 and 13),
  score_adverse integer check (score_adverse between 0 and 13),
  -- Une partie de pétanque se joue en 13 : gagnée si nous y sommes.
  gagnee boolean generated always as (score_cm = 13) stored,
  -- Exempt : pas d'adversaire, 13 à rien. Sinon : un adversaire, un score
  -- adverse, et exactement un des deux camps à 13.
  check (
    (exempt and adversaire_club is null and adversaire_numero_equipe is null
       and score_cm = 13 and score_adverse is null)
    or
    (not exempt and adversaire_club is not null and score_adverse is not null
       and (score_cm = 13) <> (score_adverse = 13))
  ),
  unique (equipe_id, numero)
);
create index promotion_parties_equipe_idx on public.promotion_parties (equipe_id);

-- Même accès que `promotion_equipes` (0007) : lecture réservée aux
-- utilisateurs autorisés, aucune policy d'écriture.
alter table public.promotion_parties enable row level security;
create policy "lecture licenciés" on public.promotion_parties
  for select using (public.est_utilisateur_autorise());

with equipes as (
  select id, source_id from public.promotion_equipes where saison = '2026'
),
parties(source_equipe, numero, adversaire_club, adversaire_no, score_cm, score_adverse) as (values
  -- Journée 6 (17/05/2026), équipe 40 — BERTEMES · FLAMMANG · BACK
  ('PROMO-FLBP-2026-J6-E40', 1, 'Schierener Bullemettïen',  34,  3, 13),
  ('PROMO-FLBP-2026-J6-E40', 2, 'B.P. Clair-Chêne Esch',    57, 13,  3),
  ('PROMO-FLBP-2026-J6-E40', 3, 'Schierener Bullemettïen',  35, 10, 13),
  ('PROMO-FLBP-2026-J6-E40', 4, 'Stenemer Bulls Steinheim', 45, 13, 12),
  -- Journée 6, équipe 41 — MARION · STEPHAN · PORCU
  ('PROMO-FLBP-2026-J6-E41', 1, 'Boule d''Or Esch',         11,  1, 13),
  ('PROMO-FLBP-2026-J6-E41', 2, 'Schierener Bullemettïen',  33, 12, 13),
  ('PROMO-FLBP-2026-J6-E41', 3, 'Stenemer Bulls Steinheim', 44, 13,  3),
  ('PROMO-FLBP-2026-J6-E41', 4, 'Stenemer Bulls Steinheim', 47,  4, 13),
  -- Journée 10 (06/09/2026), équipe 1 — MARION · FLAMMANG · MATHIS
  ('PROMO-FLBP-2026-J10-E1', 1, 'USBP Dudelange',           13,  5, 13),
  ('PROMO-FLBP-2026-J10-E1', 2, 'Schierener Bullemettïen',  25,  1, 13),
  ('PROMO-FLBP-2026-J10-E1', 4, 'CBC Belvaux-Metzerlach',   19, 13, 12),
  -- Journée 10, équipe 2 — WALTE · WALTE · HEISBOURG
  ('PROMO-FLBP-2026-J10-E2', 1, 'B.P. Clair-Chêne Esch',     4,  9, 13),
  ('PROMO-FLBP-2026-J10-E2', 2, 'KaBoule',                  47, 10, 13),
  ('PROMO-FLBP-2026-J10-E2', 3, 'Schierener Bullemettïen',  24, 13,  1),
  ('PROMO-FLBP-2026-J10-E2', 4, 'Schierener Bullemettïen',  30,  4, 13),
  -- Journée 10, équipe 3 — OLINGER · PORCU · STEPHAN
  ('PROMO-FLBP-2026-J10-E3', 1, 'Schierener Bullemettïen',  25, 13, 12),
  ('PROMO-FLBP-2026-J10-E3', 2, 'Schierener Bullemettïen',  23,  5, 13),
  ('PROMO-FLBP-2026-J10-E3', 3, 'Schierener Bullemettïen',  27, 13,  7),
  ('PROMO-FLBP-2026-J10-E3', 4, 'KaBoule',                  45,  9, 13)
)
insert into public.promotion_parties
  (equipe_id, numero, exempt, adversaire_club, adversaire_numero_equipe, score_cm, score_adverse)
select e.id, p.numero, false, p.adversaire_club, p.adversaire_no, p.score_cm, p.score_adverse
from parties p join equipes e on e.source_id = p.source_equipe;

-- Journée 10, équipe 1, partie 3 : exempte (« ex. » sur la feuille).
insert into public.promotion_parties (equipe_id, numero, exempt, score_cm)
select id, 3, true, 13 from public.promotion_equipes where source_id = 'PROMO-FLBP-2026-J10-E1';

-- ─────────────────────────────────────────────────────────────────────────
-- GARDE-FOUS
-- ─────────────────────────────────────────────────────────────────────────

do $$
declare
  detail text;
  n integer;
begin
  -- 1. Chaque trio de la saison a exactement ses quatre parties.
  select string_agg(e.source_id, ', ') into detail
    from public.promotion_equipes e
   where e.saison = '2026'
     and (select count(*) from public.promotion_parties p where p.equipe_id = e.id) <> 4;
  if detail is not null then
    raise exception 'Trios sans leurs quatre parties : %', detail;
  end if;

  -- 2. LE contrôle : les parties gagnées recomptées ici égalent, trio par
  --    trio, le bilan déjà en base (0065), lui-même contrôlé contre les
  --    totaux de club de la fédération. Deux lectures indépendantes de la
  --    même feuille doivent tomber juste.
  select string_agg(e.source_id || ' (' || e.parties_gagnees || ' attendu, '
                    || (select count(*) from public.promotion_parties p where p.equipe_id = e.id and p.gagnee)
                    || ' recompté)', ', ') into detail
    from public.promotion_equipes e
   where e.saison = '2026'
     and e.parties_gagnees <> (select count(*) from public.promotion_parties p
                                where p.equipe_id = e.id and p.gagnee);
  if detail is not null then
    raise exception 'Parties gagnées ≠ bilan du trio : %', detail;
  end if;

  -- 3. Les clubs adverses existent dans le classement de la saison (0066) :
  --    aucune graphie parasite ne s'est glissée.
  select count(*) into n
    from public.promotion_parties p
    join public.promotion_equipes e on e.id = p.equipe_id
   where e.saison = '2026' and not p.exempt
     and not exists (select 1 from public.promotion_classement c
                      where c.saison = e.saison and c.club = p.adversaire_club);
  if n > 0 then
    raise exception '% partie(s) avec un club adverse inconnu du classement.', n;
  end if;

  raise notice 'Promotion 2026 : 20 parties insérées (19 jouées + 1 exempte), trois contrôles passés.';
end $$;
