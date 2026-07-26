-- Résout le nom canonique de l'utilisateur connecté, pour le tableau de
-- bord "Mes participations" bénévole (pense-bête Jérôme, 26/07/2026 :
-- "les données que je vois sont celles qui correspondent à mon login").
-- Les affectations sont enregistrées par nom libre (canonicalisé côté
-- ajouterAffectation() via nomCanoniqueEtEstMembre — même format "Prénom
-- NOM" que dans `personnes`), pas par email/personne_id — donc il faut
-- repartir de l'email de session pour retrouver ce nom.
--
-- `personnes` est en lecture CA uniquement (0004_registre_membres.sql) :
-- un licencié non-CA ne peut pas lire sa propre fiche depuis le client.
-- security definer contourne cette RLS, mais la fonction ne renvoie que le
-- nom associé à l'email de LA session appelante (jamais un nom arbitraire)
-- — même garde-fou que est_membre_ca()/est_utilisateur_autorise().
--
-- Repli sur `acces.nom` si la personne n'est pas encore dans le registre
-- (ex. licencié pas encore saisi) — sauf pour le compte administrateur
-- masqué de Jérôme, dont acces.nom est le placeholder "Administrateur
-- (toi)" (0003_role_ca.sql) : dans ce cas précis, on veut son vrai nom
-- (celui sous lequel ses propres affectations bénévoles sont enregistrées),
-- donc `personnes` prime toujours quand elle a une ligne.
create or replace function public.mon_nom_benevole()
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  email_session text;
  nom_personne text;
  nom_acces text;
begin
  email_session := lower(coalesce(auth.jwt()->>'email', ''));
  if email_session = '' then
    return null;
  end if;

  select trim(prenom || ' ' || nom) into nom_personne
  from public.personnes
  where lower(email) = email_session and supprime = false
  limit 1;

  if nom_personne is not null then
    return nom_personne;
  end if;

  select nom into nom_acces from public.acces where lower(email) = email_session;
  return nom_acces;
end;
$$;

revoke all on function public.mon_nom_benevole from public;
grant execute on function public.mon_nom_benevole to authenticated;
