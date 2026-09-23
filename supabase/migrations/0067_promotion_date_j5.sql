-- Promotion 2026 — date de la journée 5 : décision de Jérôme (23/09/2026).
--
-- Le tableau fédéral « Total Journées » date la J5 au 10/05/2026 ;
-- `calendrier_federation` porte le 09/05/2026 (« Promotion à Schifflange
-- (J5) »). La migration 0066 avait suivi le tableau fédéral, faute de
-- décision. Jérôme tranche : **on retient la date du calendrier**.
--
-- Corrigé ici plutôt qu'en modifiant 0066 : celle-ci est déjà appliquée, et
-- le dépôt doit refléter exactement ce qui a été exécuté sur la base.
--
-- Même jour, décision connexe : l'écart de Kayl (4 rencontres publiées après
-- J6, 3 dans tous les documents suivants) est **accepté tel que traité en
-- 0066** — `promotion_resultats_club` suit le 3, `promotion_classement`
-- conserve le 4 publié. Rien à modifier.

do $$
declare
  n integer;
  date_calendrier date;
begin
  select date into date_calendrier
    from public.calendrier_federation
   where saison = '2026' and categorie = 'Promotion' and supprime = false
     and libelle like '%(J5)%';
  if date_calendrier is null then
    raise exception 'J5 introuvable dans calendrier_federation — rien modifié.';
  end if;

  update public.promotion_resultats_club
     set date = date_calendrier
   where saison = '2026' and journee = 5 and date = date '2026-05-10';
  get diagnostics n = row_count;
  if n <> 14 then
    raise exception 'J5 : % ligne(s) modifiée(s) au lieu de 14 — migration annulée.', n;
  end if;

  -- Garde-fou général, valable au-delà de la J5 : chaque journée de
  -- `promotion_resultats_club` porte désormais la date de son entrée
  -- « (Jn) » dans le calendrier fédéral. Un futur écart de date entre les
  -- deux sources se verrait ici au lieu de passer inaperçu.
  select count(*) into n
    from (select distinct journee, date from public.promotion_resultats_club where saison = '2026') r
   where not exists (
     select 1 from public.calendrier_federation c
      where c.saison = '2026' and c.categorie = 'Promotion' and c.supprime = false
        and c.libelle like '%(J' || r.journee || ')%'
        and c.date = r.date
   );
  if n > 0 then
    raise exception '% journée(s) dont la date diffère du calendrier fédéral — migration annulée.', n;
  end if;
end $$;
