-- Rôle "Trésorerie" (demande explicite de Jérôme, 02/08/2026, pour le
-- module de remboursement des frais de concours) — contrairement à
-- est_commission_sportive, ce rôle N'INCLUT PAS tout le CA : Jérôme a
-- précisé que "tous les membres du CA n'ont pas accès aux informations
-- financières". Accordé nommément à : Dominique Rousset (trésorier), Paul
-- Vitali (président), John Bravaccini (vice-président), Michel Prybyla
-- (secrétaire). Jérôme (admin) garde l'accès via `est_admin`, même
-- principe que les autres rôles security definer de ce projet.
alter table acces add column est_tresorerie boolean not null default false;

update acces set est_tresorerie = true
where email in (
  'roussetd07@gmail.com',   -- Dominique Rousset, trésorier
  'vitali.paul@gmail.com',  -- Paul Vitali, président
  'jopasama@pt.lu',         -- John Bravaccini, vice-président
  'michel.prybyla@wanadoo.fr' -- Michel Prybyla, secrétaire
);

create or replace function public.est_membre_tresorerie()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.acces
    where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
    and (est_tresorerie = true or est_admin = true)
  );
$$;

revoke all on function public.est_membre_tresorerie from public;
grant execute on function public.est_membre_tresorerie to authenticated;
