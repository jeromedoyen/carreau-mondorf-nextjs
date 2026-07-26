-- Backend pour la génération de QR SEPA à la demande, en lien avec les
-- appels de cotisation/licence (pense-bête #6/#11, discussion Jérôme du
-- 26/07/2026) — remplace à terme l'IBAN/BIC en dur dans src/lib/sepaQr.ts
-- et la saisie manuelle de /outils/qr-cotisation.

-- (1) Coordonnées bancaires du club — une seule ligne (id fixé à 1),
-- éditable par le CA. Pas de donnée sensible (un IBAN est fait pour être
-- communiqué), mais l'édition reste CA-only comme le reste de la config.
create table parametres_club (
  id smallint primary key default 1 check (id = 1),
  nom_beneficiaire text not null,
  iban text not null,
  bic text,
  ville text,
  maj_le timestamptz not null default now()
);

alter table parametres_club enable row level security;
create policy "lecture CA uniquement" on parametres_club for select using (public.est_membre_ca());
create policy "ecriture CA uniquement" on parametres_club for insert with check (public.est_membre_ca());
create policy "modification CA uniquement" on parametres_club for update using (public.est_membre_ca()) with check (public.est_membre_ca());

-- (2) Appels de paiement — table dédiée plutôt que de surcharger
-- `adhesions.cotisation_*` (0004_registre_membres.sql) : un appel peut être
-- ponctuel (pas d'année, pas forcément lié à une adhésion existante), et
-- c'est la table que lira le générateur de QR (montant + communication
-- préremplis) plutôt qu'une saisie manuelle à chaque fois.
create table appels_paiement (
  id bigint generated always as identity primary key,
  personne_id bigint references personnes (id), -- nullable : appel pas toujours lié à une fiche
  type text not null check (type in ('Cotisation', 'Licence', 'Autre')),
  montant numeric not null check (montant > 0),
  description text not null,
  reference text unique, -- généré après insertion (COT-{id}/LIC-{id}/AUT-{id}), cf. trigger
  statut text not null default 'en_attente' check (statut in ('en_attente', 'payee', 'annulee')),
  mode_paiement text,
  cree_le timestamptz not null default now(),
  payee_le timestamptz,
  supprime boolean not null default false
);
create index appels_paiement_personne_idx on appels_paiement (personne_id);
create index appels_paiement_statut_idx on appels_paiement (statut);

alter table appels_paiement enable row level security;
create policy "lecture CA uniquement" on appels_paiement for select using (public.est_membre_ca());
create policy "creation CA uniquement" on appels_paiement for insert with check (public.est_membre_ca());
create policy "modification CA uniquement" on appels_paiement for update using (public.est_membre_ca()) with check (public.est_membre_ca());

-- Référence lisible générée à partir de l'id (garantie unique sans race
-- condition, contrairement à une référence composée côté client) —
-- ex. COT-14, LIC-15, AUT-16. Utilisée comme communication du virement.
create or replace function public.generer_reference_appel_paiement()
returns trigger
language plpgsql
as $$
declare
  prefixe text;
begin
  prefixe := case new.type
    when 'Cotisation' then 'COT'
    when 'Licence' then 'LIC'
    else 'AUT'
  end;
  new.reference := prefixe || '-' || new.id;
  return new;
end;
$$;

create trigger generer_reference_appel_paiement
before insert on appels_paiement
for each row execute function public.generer_reference_appel_paiement();

create trigger journal_appels_paiement
after insert or update on appels_paiement
for each row execute function public.journaliser_modification();
