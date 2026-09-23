-- Saison 2027 : Carreau Mondorf monte en National D1 (23/09/2026, demande de
-- Jérôme : « regarde ce qui va se passer pour la saison prochaine, et
-- organise l'application en conséquence »).
--
-- ─────────────────────────────────────────────────────────────────────────
-- CE QUE LA D1 CHANGE, ET CE QU'ELLE NE CHANGE PAS
-- ─────────────────────────────────────────────────────────────────────────
--
-- Lu sur les documents fédéraux 2026 (« Résultats Championnat National -
-- Division 1 » et son classement, mêmes fichiers que la D2) :
--
--   · même format de rencontre — club contre club, score sur 63 points
--     (49-14, 60-3, 34-29…), donc les mêmes 20 parties en quatre phases que
--     la feuille de match actuelle ;
--   · même barème de classement — 2 points par victoire, 1 par défaite
--     (Riganelli 10 v. = 20 ; Schifflange 6 v. 4 d. = 16) ;
--   · **six clubs** au lieu de sept, donc dix journées et **aucun exempt**.
--
-- Tout le module National (rencontres, feuille de match, parties,
-- statistiques, classement de la poule) s'applique donc tel quel. Ce qui
-- change est un **libellé** — et il était écrit en dur, « National D2 »,
-- dans une quarantaine d'endroits.
--
-- ─────────────────────────────────────────────────────────────────────────
-- LE CHOIX : LA DIVISION EST UNE PROPRIÉTÉ DE LA SAISON
-- ─────────────────────────────────────────────────────────────────────────
--
-- Un club ne joue que dans une division par saison. La porter sur `saisons`
-- donne une seule source de vérité, lue partout où « National D2 » était
-- écrit en dur. `rencontres_d2.division` existe déjà (0001) avec la même
-- valeur par défaut ; il reste le libellé de la rencontre elle-même, et
-- devra valoir 'National D1' pour les rencontres 2027 à leur insertion.
--
-- Les tables `*_d2` et les fonctions `mes_parties_d2`, `parties_rencontre_d2`
-- **gardent leur nom** : elles portent le championnat national du club,
-- quelle que soit sa division. Les renommer toucherait cinq tables, trois
-- fonctions, leurs policies et une cinquantaine de fichiers, sans harnais de
-- test pour attraper ce qui casserait. Le nom est un héritage, documenté ;
-- ce n'est pas un mensonge sur le contenu tant que la division est lue sur
-- la saison.

alter table public.saisons
  add column division_nationale text not null default 'National D2';

comment on column public.saisons.division_nationale is
  'Division du club au championnat national cette saison-là (« National D2 », « National D1 »). Source de vérité pour tous les libellés ; les tables *_d2 portent le championnat national quelle que soit la division.';

update public.saisons set division_nationale = 'National D1' where libelle = '2027';

do $$
declare n integer;
begin
  select count(*) into n from public.saisons where libelle = '2027' and division_nationale = 'National D1';
  if n <> 1 then raise exception 'La saison 2027 n''est pas passée en National D1.'; end if;
  select count(*) into n from public.saisons where libelle in ('2025', '2026') and division_nationale <> 'National D2';
  if n <> 0 then raise exception 'Les saisons 2025 et 2026 doivent rester en National D2.'; end if;
end $$;
