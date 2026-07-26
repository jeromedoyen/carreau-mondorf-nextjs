-- Implémente enfin est_licencie()/est_membre(), documentées comme
-- "PAS ENCORE FAIT" dans 0004_registre_membres.sql faute de données
-- réelles à l'époque. Nécessaire maintenant : retour Jérôme 26/07/2026,
-- "la seule différence entre un membre et un licencié, c'est les
-- statistiques [de championnat] — je ne suis pas censé les voir en tant
-- que membre [non-licencié]".
--
-- security definer : `adhesions`/`personnes` restent CA-only en lecture
-- directe (RGPD) — cette fonction ne renvoie qu'un verdict booléen sur SA
-- PROPRE adhésion, jamais les lignes elles-mêmes. Même prudence que
-- mon_nom_benevole()/mes_parties_d2() : si l'email de session ne
-- correspond à aucune fiche personnes (écart connu entre les deux listes,
-- cf. commentaire d'origine), la réponse est false — accès refusé par
-- défaut plutôt qu'accordé par erreur.
create or replace function public.est_licencie(p_saison text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  email_session text;
  trouve boolean;
begin
  email_session := lower(coalesce(auth.jwt()->>'email', ''));
  if email_session = '' then
    return false;
  end if;

  select exists (
    select 1
    from public.adhesions a
    join public.personnes p on p.id = a.personne_id
    where lower(p.email) = email_session
      and a.annee = p_saison
      and a.type = 'Licencié'
      and a.supprime = false
      and p.supprime = false
  ) into trouve;

  return coalesce(trouve, false);
end;
$$;

revoke all on function public.est_licencie from public;
grant execute on function public.est_licencie to authenticated;
