-- Ajoute une distinction de rôle à `acces` — jusqu'ici juste une liste
-- d'autorisation (email+nom) sans notion de rôle. Nécessaire pour restreindre
-- le futur registre membres (Phase 4, RGPD-sensible) et les futures actions
-- d'écriture (Phase 5) aux seuls membres du CA, comme requireMembreCA_()
-- côté app d'origine (Code.gs) — les autres licenciés authentifiés restent
-- en lecture seule sur ce qui leur est déjà ouvert (Compétition).
alter table acces add column est_ca boolean not null default false;

-- Statut Administrateur : Jérôme a des super-pouvoirs techniques (accès CA
-- complet) sans être officiellement membre du CA — même principe que
-- l'entrée "Administrateur (toi)" avec `masque:true` dans MEMBRES_CA côté
-- app d'origine. `est_admin` accorde l'accès (voir est_membre_ca() plus
-- bas) ; `masque` sert uniquement à l'exclure des affichages listant "les
-- membres du CA" (aucun de ces affichages n'existe encore dans ce
-- prototype — à ne pas oublier le jour où l'un d'eux sera construit).
alter table acces add column est_admin boolean not null default false;
alter table acces add column masque boolean not null default false;

-- Les 4 comptes CA officiels (Paul Vitali, Michel Prybyla, John Bravaccini,
-- Dominique Rousset). Jérôme reste distinct : administrateur, pas CA
-- officiel (cf. commentaire ci-dessus) — cette ligne exclut son email.
update acces set est_ca = true where email <> 'jerome_doyen@yahoo.fr';
update acces set est_admin = true, masque = true where email = 'jerome_doyen@yahoo.fr';

-- Fonction utilitaire pour les futures policies RLS : vérifie si l'email de
-- la session authentifiée courante a un accès de niveau CA — membre du CA
-- officiel OU administrateur (super-pouvoirs, cf. ci-dessus). En
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
    and (est_ca = true or est_admin = true)
  );
$$;

revoke all on function public.est_membre_ca from public;
grant execute on function public.est_membre_ca to authenticated;

-- Niveau "a le droit de se connecter" (n'importe quelle ligne de `acces`,
-- CA ou non) — équivalent de requireSession_() côté app d'origine. À NE PAS
-- confondre avec "est licencié" au sens sportif/RGPD du terme (type
-- 'Licencié' dans la future table `adhesions`, cf. 0004_registre_membres.sql)
-- : `acces` est juste la liste d'autorisation de connexion (comme l'onglet
-- "Accès" du Sheet), une notion orthogonale au registre membres. Les vraies
-- fonctions est_licencie()/est_membre() (basées sur les données du
-- registre, pas sur `acces`) seront ajoutées une fois les tables
-- personnes/adhesions peuplées de données réelles.
create or replace function public.est_utilisateur_autorise()
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

revoke all on function public.est_utilisateur_autorise from public;
grant execute on function public.est_utilisateur_autorise to authenticated;
