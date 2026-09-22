-- Audit de confidentialité du 22/09/2026, demandé par Jérôme : « toute
-- information associée à une personne n'est-elle vue que par cette personne
-- ou par les rôles autorisés ? ». Trois défauts trouvés, corrigés ici.


-- ─────────────────────────────────────────────────────────────────────────
-- 1. FUITE — la liste nominative des licenciés était lisible sans connexion
-- ─────────────────────────────────────────────────────────────────────────
--
-- `licencies_saison('2026')` appelée avec la clé anonyme — celle qui est
-- publiée dans le navigateur — renvoyait les 62 licenciés de la saison avec
-- leur id, nom et prénom. Pas de coordonnées, mais l'annuaire du club, et
-- l'appartenance à un club est elle-même une donnée personnelle.
--
-- ⚠️ PIÈGE SUPABASE, À CONNAÎTRE POUR TOUTE FONCTION FUTURE.
--
-- La migration 0050 écrivait pourtant la bonne intention :
--
--     revoke all on function ... from public;
--     grant execute on function ... to authenticated;
--
-- Mais Supabase accorde EXECUTE au rôle `anon` par **privilège par défaut**
-- (alter default privileges), et `revoke ... from public` ne retire PAS un
-- droit accordé nommément à `anon`. Les droits réels le montraient :
--
--     {postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, ...}
--                           ^^^^^^^^^^^^^^^
--
-- Il faut donc **révoquer explicitement `anon`**, en plus de `public`.
--
-- Les 27 autres fonctions security definer portent le même défaut de droits,
-- mais aucune ne fuit : toutes dérivent l'identité de `auth.jwt()->>'email'`
-- et ne renvoient rien à un appelant anonyme — vérifié en les appelant une à
-- une avec la clé anonyme. `licencies_saison` était la seule à prendre un
-- paramètre sans vérifier qui appelle.
--
-- Les cinq appelants exigent tous une session, y compris la page de
-- clarification par jeton, qui rejette sur `mon_id_personne()` bien avant
-- d'arriver ici : cette révocation ne casse aucun parcours.

revoke all on function public.licencies_saison(text) from anon;
revoke all on function public.licencies_saison(text) from public;
grant execute on function public.licencies_saison(text) to authenticated;


-- ─────────────────────────────────────────────────────────────────────────
-- 2. FUITE MINEURE — des noms de joueurs adverses en lecture publique
-- ─────────────────────────────────────────────────────────────────────────
--
-- `rencontres_d2` est en lecture publique, et c'est voulu : ce sont les
-- scores du championnat. Mais la colonne `notes` avait reçu, à la saisie des
-- journées 12 à 14, la composition des équipes adverses — des joueurs
-- d'autres clubs, sans lien avec cette application, exposés sans connexion.
--
-- La provenance de la saisie est conservée : c'est elle qui a une valeur
-- d'audit. Les noms partent. Le détail reste disponible au comité dans
-- `parties_d2.joueurs_adverse`, table réservée au CA, où il a sa place.

update public.rencontres_d2
   set notes = 'Saisi depuis la feuille de match du 29/08/2026.'
 where saison = '2026' and journee = 12;

update public.rencontres_d2
   set notes = 'Saisi depuis la feuille de match du 05/09/2026 (Mondorf club B, '
            || 'joueurs désignés par leur nom de famille).'
 where saison = '2026' and journee = 13;

update public.rencontres_d2
   set notes = 'Saisi depuis la feuille de match du 19/09/2026 (Mondorf club A, '
            || 'joueurs désignés par leur nom de famille).'
 where saison = '2026' and journee = 14;


-- ─────────────────────────────────────────────────────────────────────────
-- 3. BUG — `mes_participations_concours` échouait pour TOUS les appelants
-- ─────────────────────────────────────────────────────────────────────────
--
--     column reference "id" is ambiguous
--     select id into mon_id from public.personnes
--
-- Le `id` du select entrait en conflit avec la colonne `id` déclarée en
-- sortie par le `returns table`. La fonction plantait à chaque appel, et
-- `/moncaro` avalait l'erreur (`.catch(() => null)` par carte) : la carte
-- « Concours et remboursements » affichait « Aucune participation déclarée »
-- à tout le monde, y compris aux licenciés qui en avaient.
--
-- Corrigé en qualifiant la colonne (`p.id`). Le reste est identique à la
-- migration 0051.

create or replace function public.mes_participations_concours(p_saison text)
returns table (
  id bigint,
  type text,
  source text,
  personne_id bigint,
  personne_nom text,
  chef_equipe_id bigint,
  chef_equipe_nom text,
  date date,
  club text,
  pays text,
  hors_calendrier boolean,
  hors_pays boolean,
  repas_inclus boolean,
  montant_final numeric,
  statut text,
  paye_le timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  mon_id bigint;
begin
  select p.id into mon_id from public.personnes p
  where lower(p.email) = lower(coalesce(auth.jwt()->>'email', '')) and p.supprime = false;
  if mon_id is null then
    return;
  end if;

  return query
  select
    pc.id, pc.type, pc.source, pc.personne_id,
    (p.prenom || ' ' || p.nom) as personne_nom,
    pc.chef_equipe_id,
    (cp.prenom || ' ' || cp.nom) as chef_equipe_nom,
    pc.date, pc.club, pc.pays, pc.hors_calendrier, pc.hors_pays, pc.repas_inclus,
    pc.montant_final, pc.statut, pc.paye_le
  from public.participations_concours pc
  join public.personnes p on p.id = pc.personne_id
  left join public.personnes cp on cp.id = pc.chef_equipe_id
  where pc.saison = p_saison
    and pc.supprime = false
    and (pc.personne_id = mon_id or pc.chef_equipe_id = mon_id)
  order by pc.date desc;
end;
$$;

revoke all on function public.mes_participations_concours(text) from anon;
revoke all on function public.mes_participations_concours(text) from public;
grant execute on function public.mes_participations_concours(text) to authenticated;
