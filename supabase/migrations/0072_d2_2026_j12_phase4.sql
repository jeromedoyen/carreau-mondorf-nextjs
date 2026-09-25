-- National D2 2026, J12 (29/08, Carreau Mondorf 44 – Schieren 19) :
-- composition des triplettes de la phase 4 corrigée (25/09/2026).
--
-- Jérôme signale que la composition enregistrée pour Michel PRYBYLA n'est
-- pas la bonne. Trois documents pour cette rencontre :
--
--   v1  feuille dactylographiée (Téléchargements, 31/08) — celle qui a servi
--       à la saisie du 31/08 ;
--   manuscrit  « Feuille de match officielle », signée des deux capitaines
--       et de l'arbitre (même dossier, scan de 3 pages) ;
--   v2  version dactylographiée corrigée, transmise par Jérôme le 25/09.
--
-- Comparées mot à mot, v1 et v2 ne diffèrent qu'en **trois cases, toutes en
-- phase 4**, et v2 concorde avec le manuscrit :
--
--   Triplette 1 (11-13) : SCHMIT · COLPIN · HONGROIS  →  BEGUE
--   Triplette 2 (13-9)  : ROUSSET · BEGUE · MARION   →  OCHEM au lieu de BEGUE
--   Triplette 3 (13-7)  : LE BERRE · PRYBYLA · OCHEM →  HONGROIS au lieu d'OCHEM
--
-- Sur le manuscrit, le troisième nom de la triplette 1 est raturé et
-- illisible ; il avait été déduit BEGUE par élimination (chaque joueur joue
-- une fois par phase) avant que v2 ne le confirme.
--
-- Effets : PRYBYLA garde ses résultats, son partenaire de phase 4 devient
-- HONGROIS. BEGUE passe d'une triplette gagnée à une perdue (−1 victoire,
-- −5 points) ; HONGROIS l'inverse (+1, +5). OCHEM reste gagnant.
--
-- Non modifié : le tête-à-tête de MARION en phase 3. Le manuscrit semble
-- porter 13-11, v1 et v2 disent 13-12. Aucun effet sur les points (la
-- victoire vaut 3 quel que soit le score adverse) ; on suit v2, la version
-- de Jérôme. Écart noté au journal.
--
-- Rencontre désignée par (saison, journée), jamais par un identifiant
-- généré. Seules les parties actives (`supprime = false`) sont touchées.

do $$
declare
  rid bigint;
  n integer;
  detail text;
begin
  select id into rid from public.rencontres_d2
   where saison = '2026' and journee = 12 and club_adverse = 'Schierener Bullemettïen';
  if rid is null then raise exception 'Rencontre J12 2026 introuvable.'; end if;

  -- Garde-fou d'entrée : on ne corrige que si la base porte exactement la
  -- version v1. Si quelqu'un l'a modifiée entre-temps, on ne l'écrase pas.
  select count(*) into n from public.parties_d2
   where rencontre_id = rid and not supprime and phase = 4 and type = 'Triplette'
     and ((ordre = 1 and joueurs_cm = 'SCHMIT Marie-Louise, COLPIN Christophe, HONGROIS Julien' and score_cm = 11 and score_adverse = 13)
       or (ordre = 2 and joueurs_cm = 'ROUSSET Dominique, BEGUE Yann, MARION Stéphane'       and score_cm = 13 and score_adverse = 9)
       or (ordre = 3 and joueurs_cm = 'LE BERRE Yann, PRYBYLA Michel, OCHEM Eric'           and score_cm = 13 and score_adverse = 7));
  if n <> 3 then
    raise exception 'Phase 4 de la J12 : % triplette(s) sur 3 dans l''état attendu — base modifiée entre-temps, rien n''est écrit.', n;
  end if;

  update public.parties_d2 set joueurs_cm = 'SCHMIT Marie-Louise, COLPIN Christophe, BEGUE Yann'
   where rencontre_id = rid and not supprime and phase = 4 and type = 'Triplette' and ordre = 1;
  update public.parties_d2 set joueurs_cm = 'ROUSSET Dominique, OCHEM Eric, MARION Stéphane'
   where rencontre_id = rid and not supprime and phase = 4 and type = 'Triplette' and ordre = 2;
  update public.parties_d2 set joueurs_cm = 'LE BERRE Yann, PRYBYLA Michel, HONGROIS Julien'
   where rencontre_id = rid and not supprime and phase = 4 and type = 'Triplette' and ordre = 3;

  -- Garde-fous de sortie : 20 parties actives ; chacun des neuf joueurs
  -- une fois par phase, quatre fois en tout ; le score de la rencontre
  -- toujours reconstitué (44-19) au barème FLBP.
  select count(*) into n from public.parties_d2 where rencontre_id = rid and not supprime;
  if n <> 20 then raise exception '% parties actives au lieu de 20.', n; end if;

  select string_agg(joueur || ' (' || nb || ' parties, ' || phases || ' phases)', ', ') into detail
    from (
      select trim(j) as joueur, count(*) as nb, count(distinct p.phase) as phases
        from public.parties_d2 p, unnest(string_to_array(p.joueurs_cm, ',')) as j
       where p.rencontre_id = rid and not p.supprime
       group by trim(j)
    ) t
   where nb <> 4 or phases <> 4;
  if detail is not null then raise exception 'Joueurs mal répartis : %', detail; end if;

  select count(distinct trim(j)) into n
    from public.parties_d2 p, unnest(string_to_array(p.joueurs_cm, ',')) as j
   where p.rencontre_id = rid and not p.supprime;
  if n <> 9 then raise exception '% joueurs distincts au lieu de 9.', n; end if;

  select sum(case when score_cm > score_adverse then
               case type when 'Triplette' then 5 when 'Doublette' then 3
                         else case when phase = 3 then 3 else 2 end end
             else 0 end) into n
    from public.parties_d2 where rencontre_id = rid and not supprime;
  if n <> 44 then raise exception 'Score reconstitué % au lieu de 44.', n; end if;

  raise notice 'J12 2026 : phase 4 corrigée selon la feuille officielle et la version 2.';
end $$;
