-- Tableau de bord personnel "Moncaro" (/moncaro) — page d'atterrissage
-- après connexion, actée avec Jérôme le 26/07/2026 ("je voudrais qu'il
-- serait bon que j'arrive sur ma page personnelle... une sorte de tableau
-- de bord de mes informations, de ma situation vis-à-vis du club").
--
-- `personnes`/`adhesions` restent CA-only en lecture directe (RGPD,
-- 0004_registre_membres.sql) — même principe que mon_nom_benevole()
-- (migration 0020) et est_licencie() (migration 0025) : cette fonction ne
-- renvoie QUE la ligne d'adhésion de la session courante, jamais le
-- registre, et null si aucune correspondance (accès refusé par défaut).
create or replace function public.mon_adhesion(p_saison text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  email_session text;
  resultat jsonb;
begin
  email_session := lower(coalesce(auth.jwt()->>'email', ''));
  if email_session = '' then
    return null;
  end if;

  select to_jsonb(t) into resultat
  from (
    select
      a.type,
      a.categorie,
      a.cotisation_payee,
      a.cotisation_montant,
      a.cotisation_date,
      a.licence_payee,
      a.licence_montant,
      a.licence_date
    from public.adhesions a
    join public.personnes p on p.id = a.personne_id
    where lower(p.email) = email_session
      and a.annee = p_saison
      and a.supprime = false
      and p.supprime = false
    limit 1
  ) t;

  return resultat;
end;
$$;

revoke all on function public.mon_adhesion from public;
grant execute on function public.mon_adhesion to authenticated;
