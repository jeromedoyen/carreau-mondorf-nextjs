-- Liste d'autorisation minimale pour l'authentification (OTP email) —
-- équivalent de l'onglet "Accès" du Sheet côté app d'origine (Code.gs).
-- Volontairement léger : juste email + nom, pas le registre complet
-- (Personnes/Adhésions, RGPD-sensible) qui reste une phase ultérieure.
create table acces (
  email text primary key,
  nom text not null
);

-- Pas de politique de lecture publique : cette table n'est consultée que par
-- le Auth Hook Supabase (exécuté en tant que postgres, contourne la RLS) qui
-- valide l'email avant l'envoi du code OTP. Aucun accès direct depuis le
-- client, contrairement aux autres tables de ce schéma.
alter table acces enable row level security;

-- Auth Hook "Before User Created" — rejette la création d'un compte auth
-- (donc l'envoi du code OTP) pour tout email absent de la table `acces`.
-- Équivalent de isAuthorized_(email) dans Code.gs (app d'origine).
-- Contrat d'entrée/sortie : https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook
--
-- ⚠️ Ne s'active pas tout seul : à câbler manuellement dans le Dashboard
-- Supabase → Authentication → Hooks → "Before user created", pointer vers
-- public.verifier_acces_avant_creation. Étape hors de portée de Claude (pas
-- d'accès au Dashboard) — à faire par Jérôme.
create or replace function public.verifier_acces_avant_creation(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_demande text;
begin
  email_demande := lower(trim(event->'user'->>'email'));

  if email_demande is null or not exists (
    select 1 from public.acces where lower(email) = email_demande
  ) then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Cet email n''est pas autorisé à accéder à l''application.'
      )
    );
  end if;

  return '{}'::jsonb;
end;
$$;

revoke execute on function public.verifier_acces_avant_creation from anon, authenticated;
grant execute on function public.verifier_acces_avant_creation to supabase_auth_admin;
