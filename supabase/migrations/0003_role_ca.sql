-- Ajoute une distinction de rôle à `acces` — jusqu'ici juste une liste
-- d'autorisation (email+nom) sans notion de rôle. Nécessaire pour restreindre
-- le futur registre membres (Phase 4, RGPD-sensible) et les futures actions
-- d'écriture (Phase 5) aux seuls membres du CA, comme requireMembreCA_()
-- côté app d'origine (Code.gs) — les autres licenciés authentifiés restent
-- en lecture seule sur ce qui leur est déjà ouvert (Compétition).
alter table acces add column est_ca boolean not null default false;

-- Les 5 comptes déjà importés (session du 22/07) sont tous des membres du
-- CA (Paul Vitali, Michel Prybyla, John Bravaccini, Dominique Rousset,
-- Administrateur/Jérôme) — aucun licencié "simple" n'a encore de compte.
update acces set est_ca = true;

-- Fonction utilitaire pour les futures policies RLS : vérifie si l'email de
-- la session authentifiée courante appartient à un membre du CA. En
-- `security definer` pour pouvoir lire `acces` malgré l'absence de policy de
-- lecture publique sur cette table (volontaire, cf. 0002_acces.sql) — évite
-- d'exposer les lignes de `acces` directement aux clients authentifiés,
-- seul ce verdict booléen est accessible.
create or replace function public.est_membre_ca()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.acces
    where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    and est_ca = true
  );
$$;

revoke all on function public.est_membre_ca from public;
grant execute on function public.est_membre_ca to authenticated;

-- Pendant de est_membre_ca(), niveau "tout licencié connecté" — équivalent
-- de requireSession_() côté app d'origine (contre requireMembreCA_() pour
-- le niveau CA ci-dessus). En pratique : quiconque a un compte dans `acces`,
-- CA ou non. Sert à distinguer "public" / "licencié" / "CA" une fois les
-- premières pages relockées derrière l'auth (cf. statistiques individuelles,
-- publiques "pour l'instant" depuis la Phase 1 — à reverrouiller ici).
create or replace function public.est_licencie()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.acces
    where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  );
$$;

revoke all on function public.est_licencie from public;
grant execute on function public.est_licencie to authenticated;
