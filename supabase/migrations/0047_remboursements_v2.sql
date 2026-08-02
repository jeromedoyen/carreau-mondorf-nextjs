-- Remboursements des frais de concours — Phase 2 (refonte complète, cahier
-- des charges de Jérôme du 02/08/2026, cf.
-- Obsidian/Automind Consulting/30_Produits_&_Solutions/
-- Carreau_Mondorf_Remboursements_Concours_CahierDesCharges.md). La Phase 1
-- (0045) a été jugée "pas du tout fonctionnelle, pas intuitive" — décision
-- explicite de Jérôme : repartir sur un modèle de données propre plutôt
-- que patcher. Aucune donnée réelle n'existait encore dans les tables
-- Phase 1 (jamais utilisée en conditions réelles), donc rien à migrer.

drop trigger if exists trg_verrouiller_participation_payee on participations_exterieures;
drop trigger if exists trg_calculer_montant_participation on participations_exterieures;
drop trigger if exists trg_maj_date_concours_participation on participations_exterieures;
drop function if exists public.verrouiller_participation_payee();
drop function if exists public.calculer_montant_participation();
drop function if exists public.maj_date_concours_participation();
drop table if exists participations_exterieures;
drop table if exists baremes_indemnites;
drop table if exists concours_exterieurs;

-- Montant fixe de remboursement par joueur pour le championnat (D2 et
-- Promotion, "automatiques") — paramétrable au même endroit que les
-- coordonnées bancaires du club, comme demandé ("au même endroit que les
-- cotisations").
alter table parametres_club add column montant_remboursement_concours numeric not null default 10;

-- Une ligne = la participation d'UNE personne à UN concours. Le modèle
-- Phase 1 séparait concours/participations en deux tables — inutile ici,
-- la plupart des champs (date, club, pays, règle) sont propres à chaque
-- participation individuelle même pour un concours "collectif" (chaque
-- coéquipier peut avoir un montant/statut différent en cas de correction).
create table participations_concours (
  id bigint generated always as identity primary key,
  saison text not null,
  type text not null check (type in ('Championnat_D2', 'Promotion', 'Concours')),
  source text not null check (source in ('auto', 'manuel')),
  personne_id bigint not null references personnes (id),

  -- Concours "manuel" uniquement : le chef d'équipe saisit pour lui-même
  -- ET ses partenaires (une ligne par joueur), mais un seul reçoit le
  -- virement — cf. section 5. Nul pour Championnat_D2/Promotion (pas de
  -- notion de chef, chacun est remboursé directement).
  chef_equipe_id bigint references personnes (id),

  rencontre_d2_id bigint references rencontres_d2 (id),
  journee_promotion integer,

  date date not null,
  club text,
  pays text not null default 'LU',
  hors_calendrier boolean not null default false,
  -- Règle non définie à ce jour (cf. cahier des charges §2, "hors pays :
  -- règle à confirmer") — volontairement JAMAIS calculée automatiquement
  -- (voir trigger plus bas) : reste grisée côté UI tant que le trésorier
  -- ou le CA n'a pas tranché, pour ne pas perdre le fait que la règle
  -- manque.
  hors_pays boolean not null default false,

  -- Concours manuel : montant réel d'inscription payé par l'équipe
  -- (ex. 50€ pour une triplette), et si le repas était inclus dans ce prix
  -- (déclenche le remboursement à 50%, cf. cahier des charges §2).
  inscription_montant numeric,
  repas_inclus boolean not null default false,

  montant_final numeric,
  statut text not null default 'en_attente' check (statut in ('en_attente', 'valide', 'paye')),
  paye_le timestamptz,
  paye_par text,

  notes text,
  cree_le timestamptz not null default now(),
  supprime boolean not null default false
);
create index participations_concours_personne_idx on participations_concours (personne_id);
create index participations_concours_saison_idx on participations_concours (saison);
create index participations_concours_rencontre_d2_idx on participations_concours (rencontre_d2_id);

alter table participations_concours enable row level security;

-- Lecture : le joueur voit ses propres participations (les siennes ET
-- celles où il est chef d'équipe pour voir le total reçu), la trésorerie
-- voit tout.
create policy "lecture personnelle ou tresorerie" on participations_concours for select using (
  public.est_membre_tresorerie()
  or personne_id in (select id from public.personnes where lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
  or chef_equipe_id in (select id from public.personnes where lower(email) = lower(coalesce(auth.jwt()->>'email', '')))
);

-- Écriture : la trésorerie peut tout faire (génération des listes
-- automatiques, validation, paiement). Un licencié peut créer une
-- participation manuelle où IL est le chef d'équipe — vérifié côté
-- application (Server Action, pas la RLS, car "chef_equipe_id = moi" doit
-- s'appliquer à toutes les lignes d'un même concours, y compris celles de
-- ses partenaires qui ne sont pas lui). La RLS se contente d'autoriser
-- l'insertion "manuel" à tout licencié connecté ; la vérification fine
-- (chef = utilisateur courant) est faite dans creerParticipationManuelle().
create policy "ecriture tresorerie" on participations_concours for all using (public.est_membre_tresorerie()) with check (public.est_membre_tresorerie());
create policy "creation manuelle par licencie" on participations_concours for insert with check (
  source = 'manuel' and public.est_utilisateur_autorise()
);

-- Calcul automatique du montant, jamais pour "hors pays" (règle non
-- définie — reste NULL, à saisir manuellement par la trésorerie une fois
-- la règle tranchée).
create or replace function public.calculer_montant_participation_concours()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_montant_fixe numeric;
begin
  if new.hors_pays = true then
    new.montant_final := null;
    return new;
  end if;

  if new.type in ('Championnat_D2', 'Promotion') then
    select montant_remboursement_concours into v_montant_fixe from public.parametres_club where id = 1;
    new.montant_final := v_montant_fixe;
  elsif new.inscription_montant is not null then
    new.montant_final := case when new.repas_inclus then new.inscription_montant * 0.5 else new.inscription_montant end;
  end if;

  return new;
end;
$$;

create trigger trg_calculer_montant_participation_concours
before insert or update of type, hors_pays, inscription_montant, repas_inclus on participations_concours
for each row execute function public.calculer_montant_participation_concours();

-- Verrou anti-double-paiement — même principe que la Phase 1 (0045) :
-- une fois payé, plus de modification silencieuse du montant.
create or replace function public.verrouiller_participation_concours_payee()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.statut = 'paye' and new.statut = 'paye' and (new.montant_final is distinct from old.montant_final) then
    raise exception 'Participation déjà payée : repasser par le statut "valide" pour corriger le montant.';
  end if;
  return new;
end;
$$;

create trigger trg_verrouiller_participation_concours_payee
before update on participations_concours
for each row execute function public.verrouiller_participation_concours_payee();

-- Anti-doublon Championnat D2 : une seule ligne par (rencontre, joueur) —
-- la génération automatique doit pouvoir être relancée sans dupliquer.
create unique index participations_concours_d2_anti_doublon_idx
  on participations_concours (rencontre_d2_id, personne_id)
  where rencontre_d2_id is not null and supprime = false;
