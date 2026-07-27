-- Phase B du workflow adhésion (27/07/2026) : réactive la réinscription,
-- mais pas comme formulaire public — un membre déjà connu se réinscrit
-- depuis Moncaro, avec ses informations préremplies. `personnes` reste
-- CA-only en lecture directe (RGPD) et `demandes_adhesion` n'a jamais eu
-- de policy d'insertion pour le rôle `authenticated` (seulement `anon`,
-- pour la soumission publique initiale, cf. 0015_demandes_adhesion.sql) —
-- deux RPC security definer plutôt que d'ouvrir ces deux tables plus
-- largement, même principe que le reste de ce fichier de migrations.

-- Préremplissage du formulaire de réinscription à partir de la fiche déjà
-- connue — ne renvoie que la ligne de la session courante.
create or replace function public.mes_informations_personnelles()
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
    select nom, prenom, sexe, date_naissance, nationalite, adresse, code_postal_ville, telephone, email, droit_image
    from public.personnes
    where lower(email) = email_session and supprime = false
    limit 1
  ) t;

  return resultat;
end;
$$;

revoke all on function public.mes_informations_personnelles from public;
grant execute on function public.mes_informations_personnelles to authenticated;

-- Soumission de la demande de réinscription — résout le personne_id à
-- partir de la session (jamais transmis par le client), pour que le CA
-- n'ait pas à retrouver manuellement de qui il s'agit au moment du
-- traitement (contrairement à une inscription initiale, où la personne
-- n'existe pas encore).
create or replace function public.soumettre_reinscription(
  p_nom text, p_prenom text, p_date_naissance date, p_sexe text, p_nationalite text,
  p_adresse text, p_code_postal_ville text, p_telephone text, p_email text,
  p_type_adhesion_souhaite text, p_droit_image boolean, p_message text,
  p_consent_reglement boolean, p_consent_donnees boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_session text;
  id_personne bigint;
begin
  email_session := lower(coalesce(auth.jwt()->>'email', ''));
  if email_session = '' then
    raise exception 'Session invalide.';
  end if;
  if not p_consent_reglement or not p_consent_donnees then
    raise exception 'Les engagements (règlement intérieur et traitement des données) sont obligatoires.';
  end if;

  select id into id_personne from public.personnes where lower(email) = email_session and supprime = false limit 1;

  insert into public.demandes_adhesion (
    type_demande, nom, prenom, date_naissance, sexe, nationalite, adresse, code_postal_ville,
    telephone, email, type_adhesion_souhaite, droit_image, message, consent_reglement, consent_donnees,
    personne_id
  ) values (
    'Réinscription', p_nom, p_prenom, p_date_naissance, p_sexe, p_nationalite, p_adresse, p_code_postal_ville,
    p_telephone, p_email, p_type_adhesion_souhaite, p_droit_image, p_message, p_consent_reglement, p_consent_donnees,
    id_personne
  );

  return true;
end;
$$;

revoke all on function public.soumettre_reinscription from public;
grant execute on function public.soumettre_reinscription to authenticated;
