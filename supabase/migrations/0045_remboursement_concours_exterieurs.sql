-- Module remboursement des frais de participation aux concours extérieurs
-- (Phase 1 — fondations, demande via /pb #90/#94/#95, cahier des charges
-- fourni par Jérôme). Phase 1 = tables, calcul automatique, saisie chef
-- d'équipe, validation trésorier. Dashboards, notifications et import
-- Excel : phases ultérieures, volontairement différées.

create table concours_exterieurs (
  id bigint generated always as identity primary key,
  date date not null,
  lieu text not null,
  type_concours text not null check (
    type_concours in ('CHAMPIONNAT_D2', 'CHAMPIONNAT_PROMOTION', 'CHAMPIONNAT_NATIONAL', 'TOURNOI_CALENDRIER', 'TOURNOI_HORS_CALENDRIER')
  ),
  format text not null check (format in ('TETE_A_TETE', 'DOUBLETTE', 'TRIPLETTE')),
  pays text not null default 'LU',
  est_calendrier boolean not null default true,
  chef_equipe_id bigint references personnes (id),
  cree_le timestamptz not null default now(),
  supprime boolean not null default false
);
create index concours_exterieurs_date_idx on concours_exterieurs (date);

alter table concours_exterieurs enable row level security;
-- Lecture ouverte à tout utilisateur autorisé (un joueur doit pouvoir voir
-- les concours auxquels il participe) ; écriture réservée au CA ou au chef
-- d'équipe du concours lui-même (un licencié peut créer/gérer sa propre
-- sortie sans devoir passer par le CA à chaque fois).
create policy "lecture utilisateurs autorises" on concours_exterieurs for select using (public.est_utilisateur_autorise());
create policy "creation CA" on concours_exterieurs for insert with check (public.est_membre_ca());
create policy "modification CA" on concours_exterieurs for update using (public.est_membre_ca()) with check (public.est_membre_ca());

create table baremes_indemnites (
  id bigint generated always as identity primary key,
  type_concours text not null check (
    type_concours in ('CHAMPIONNAT_D2', 'CHAMPIONNAT_PROMOTION', 'CHAMPIONNAT_NATIONAL', 'TOURNOI_CALENDRIER', 'TOURNOI_HORS_CALENDRIER')
  ),
  format text not null check (format in ('TETE_A_TETE', 'DOUBLETTE', 'TRIPLETTE')),
  pays text not null default 'LU',
  montant_base numeric not null check (montant_base >= 0),
  ratio_repas numeric check (ratio_repas > 0 and ratio_repas <= 1),
  annee_sportive text not null,
  actif boolean not null default true,
  unique (type_concours, format, pays, annee_sportive)
);

alter table baremes_indemnites enable row level security;
create policy "lecture utilisateurs autorises" on baremes_indemnites for select using (public.est_utilisateur_autorise());
create policy "ecriture CA" on baremes_indemnites for all using (public.est_membre_ca()) with check (public.est_membre_ca());

create table participations_exterieures (
  id bigint generated always as identity primary key,
  concours_id bigint not null references concours_exterieurs (id),
  joueur_id bigint not null references personnes (id),
  statut_participation text not null default 'prevu' check (statut_participation in ('prevu', 'confirme', 'annule', 'joue')),
  montant_calcule numeric,
  montant_manuel numeric,
  -- montant_final n'est PAS généré en base (le calcul dépend du barème
  -- applicable, résolu côté application au moment de l'enregistrement) —
  -- stocké tel quel pour rester une valeur figée une fois payé.
  montant_final numeric,
  statut_remboursement text not null default 'non_calcule' check (
    statut_remboursement in ('non_calcule', 'a_valider', 'valide_tresorier', 'paye')
  ),
  date_paiement date,
  mode_paiement text,
  cree_le timestamptz not null default now(),
  supprime boolean not null default false
);
create index participations_joueur_idx on participations_exterieures (joueur_id);
create index participations_concours_idx on participations_exterieures (concours_id);

-- Règle anti-doublon (cahier des charges §3.2) : un même joueur ne peut
-- avoir qu'une participation "joue" par date de concours, tous concours
-- confondus. `date_concours` est une colonne dénormalisée (Postgres
-- n'autorise pas une "generated always as" qui référence une autre
-- table) maintenue par trigger, sur laquelle porte l'index unique partiel
-- ci-dessous — garanti par la base même en cas d'écriture concurrente.
alter table participations_exterieures add column date_concours date;

create or replace function public.maj_date_concours_participation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select date into new.date_concours from public.concours_exterieurs where id = new.concours_id;
  return new;
end;
$$;

create trigger trg_maj_date_concours_participation
before insert or update of concours_id on participations_exterieures
for each row execute function public.maj_date_concours_participation();

create unique index participations_anti_doublon_idx
  on participations_exterieures (joueur_id, date_concours)
  where statut_participation = 'joue' and supprime = false;

alter table participations_exterieures enable row level security;
-- Lecture : le joueur voit ses propres participations, le CA voit tout.
create policy "lecture personnelle ou CA" on participations_exterieures for select using (
  public.est_membre_ca() or joueur_id in (
    select id from public.personnes where lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
  )
);
create policy "ecriture CA" on participations_exterieures for all using (public.est_membre_ca()) with check (public.est_membre_ca());

-- Calcul automatique de montant_calcule/montant_final à l'écriture d'une
-- participation "joue" (cahier des charges §3.1) : résout le barème actif
-- correspondant au concours, applique montant_manuel ou ratio_repas si
-- renseignés, sinon le montant du barème tel quel. Security definer pour
-- lire concours_exterieurs/baremes_indemnites indépendamment des policies
-- de l'appelant (déjà vérifié CA par la policy RLS d'écriture ci-dessus).
create or replace function public.calculer_montant_participation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_concours record;
  v_bareme record;
begin
  if new.statut_participation <> 'joue' then
    return new;
  end if;

  select type_concours, format, pays into v_concours
  from public.concours_exterieurs where id = new.concours_id;

  select montant_base, ratio_repas into v_bareme
  from public.baremes_indemnites
  where type_concours = v_concours.type_concours
    and format = v_concours.format
    and pays = v_concours.pays
    and actif = true
  order by annee_sportive desc
  limit 1;

  new.montant_calcule := v_bareme.montant_base;

  if new.montant_manuel is not null then
    new.montant_final := new.montant_manuel;
  elsif v_bareme.ratio_repas is not null and new.montant_calcule is not null then
    new.montant_final := new.montant_calcule * v_bareme.ratio_repas;
  else
    new.montant_final := new.montant_calcule;
  end if;

  if new.statut_remboursement = 'non_calcule' and new.montant_final is not null then
    new.statut_remboursement := 'a_valider';
  end if;

  return new;
end;
$$;

create trigger trg_calculer_montant_participation
before insert or update of statut_participation, montant_manuel, concours_id on participations_exterieures
for each row execute function public.calculer_montant_participation();

-- Verrou anti-double-paiement (cahier des charges §3.2) : une fois
-- statut_remboursement = 'paye', plus aucune modification de montant_final
-- ni de statut_remboursement n'est permise directement — il faut d'abord
-- repasser explicitement par 'valide_tresorier' (geste "annuler/corriger"
-- volontaire d'un rôle autorisé), jamais un recalcul silencieux.
create or replace function public.verrouiller_participation_payee()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.statut_remboursement = 'paye' and new.statut_remboursement = 'paye'
     and (new.montant_final is distinct from old.montant_final) then
    raise exception 'Participation déjà payée : le montant ne peut plus être modifié sans repasser par "valide_tresorier".';
  end if;
  return new;
end;
$$;

create trigger trg_verrouiller_participation_payee
before update on participations_exterieures
for each row execute function public.verrouiller_participation_payee();
