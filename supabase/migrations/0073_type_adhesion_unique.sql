-- Une seule orthographe pour le type d'adhésion « non-licencié »
-- (25/09/2026, signalement de Jérôme : « 4 nouveaux membres ont un filtre
-- différent des autres, je pense que c'est une histoire de parenthèse »).
--
-- Constat en base, saison 2026, adhésions actives :
--
--   « Licencié »                 74
--   « Membre non-licencié »      60   ← import de la V1 (source_id A-…)
--   « Membre (non-licencié) »    14   ← formulaires de l'application
--
-- Parmi les personnes affichées dans `/membres` : 58 d'un côté, **4** de
-- l'autre — les quatre membres enregistrés depuis l'application, que le
-- filtre « Type » rangeait à part.
--
-- Valeur retenue : **« Membre (non-licencié) »**, avec parenthèses. C'est
-- celle qu'écrivent les trois formulaires (nouveau membre, inscription,
-- réinscription) et les demandes d'adhésion, et celle que documente 0004.
-- Garder l'autre aurait laissé chaque nouveau membre recréer l'écart.
--
-- Aucun traitement ne dépend de ce libellé : partout, le code distingue
-- `type = 'Licencié'` du reste (cotisation, licence, `est_licencie()`,
-- contrôle fédération, statistiques). Le changement ne modifie que
-- l'affichage et le filtre.
--
-- Puis une contrainte : plus aucune troisième orthographe ne pourra
-- entrer, par un formulaire, un import ou une saisie directe.

update public.adhesions
   set type = 'Membre (non-licencié)'
 where type = 'Membre non-licencié';

alter table public.adhesions
  add constraint adhesions_type_check
  check (type in ('Licencié', 'Membre (non-licencié)'));

alter table public.demandes_adhesion
  add constraint demandes_adhesion_type_souhaite_check
  check (type_adhesion_souhaite is null
         or type_adhesion_souhaite in ('Licencié', 'Membre (non-licencié)'));

do $$
declare
  n integer;
  types text;
begin
  select string_agg(distinct type, ' | ' order by type) into types from public.adhesions;
  if types <> 'Licencié | Membre (non-licencié)' then
    raise exception 'Types restants inattendus : %', types;
  end if;

  -- Les 62 non-licenciés affichés (58 + 4) sont désormais sous une seule valeur.
  select count(*) into n
    from public.adhesions a join public.personnes p on p.id = a.personne_id
   where a.annee = '2026' and not a.supprime and not p.supprime
     and a.type = 'Membre (non-licencié)';
  if n <> 62 then
    raise exception '% non-licenciés affichés en 2026 au lieu de 62.', n;
  end if;

  raise notice 'Type d''adhésion : une seule orthographe, 62 non-licenciés 2026 réunis.';
end $$;
