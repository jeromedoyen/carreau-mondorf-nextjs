-- Rôle "Commission sportive" (demande via /pb, 01/08/2026) — Michel Prybyla,
-- Marco Bertemes et Yann Le Berre. Michel et Marco sont déjà CA (accès
-- complet, rien à changer pour eux) ; seul Yann Le Berre avait besoin d'un
-- accès. Même principe que est_ca (0003_role_ca.sql) : colonne booléenne
-- sur `acces` + fonction security definer pour les futures policies RLS.
--
-- Fondation seulement : aucune fonctionnalité ne vérifie encore ce rôle
-- (la demande d'origine ne précisait pas d'action concrète à débloquer) —
-- à câbler le jour où un écran/une action doit être réservée à ce rôle
-- plutôt qu'au CA en entier.
alter table acces add column est_commission_sportive boolean not null default false;

insert into acces (email, nom, est_commission_sportive)
values ('yleberre@msn.com', 'Yann LE BERRE', true)
on conflict (email) do update set nom = excluded.nom, est_commission_sportive = true;

update acces set est_commission_sportive = true
where email in ('michel.prybyla@wanadoo.fr', 'bertemem@pt.lu');

create or replace function public.est_membre_commission_sportive()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.acces
    where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    and (est_commission_sportive = true or est_ca = true or est_admin = true)
  );
$$;

revoke all on function public.est_membre_commission_sportive from public;
grant execute on function public.est_membre_commission_sportive to authenticated;
