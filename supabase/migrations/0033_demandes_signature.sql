-- Module "Demander une signature électronique" (27/07/2026) — PV/comptes
-- rendus signés par les membres du CA via DocuSeal (auto-hébergé, API +
-- webhooks gratuits en édition communautaire). Nommage cohérent avec le
-- reste du schéma (français, pas de table "members" — les signataires
-- sont choisis dans `acces` au moment de la création, via la RPC
-- signataires_ca() plus bas, jamais une table dupliquée).

-- (1) Bucket de stockage — privé, CA-only. Contient à la fois les PDF
-- d'origine et les PDF signés récupérés depuis DocuSeal.
insert into storage.buckets (id, name, public) values ('documents-signature', 'documents-signature', false);

create policy "CA lecture documents-signature" on storage.objects for select
  using (bucket_id = 'documents-signature' and public.est_membre_ca());
create policy "CA ecriture documents-signature" on storage.objects for insert
  with check (bucket_id = 'documents-signature' and public.est_membre_ca());
create policy "CA modification documents-signature" on storage.objects for update
  using (bucket_id = 'documents-signature' and public.est_membre_ca());

-- (2) Documents source (PV, comptes rendus...) avant toute demande de
-- signature — une demande peut en théorie être relancée sur le même
-- document, d'où la séparation document/demande plutôt qu'une table
-- unique.
create table documents (
  id bigint generated always as identity primary key,
  titre text not null,
  chemin_storage text not null,
  cree_par_email text not null,
  cree_le timestamptz not null default now(),
  supprime boolean not null default false
);

alter table documents enable row level security;
create policy "CA lecture documents" on documents for select using (public.est_membre_ca());
create policy "CA creation documents" on documents for insert with check (public.est_membre_ca());
create policy "CA modification documents" on documents for update using (public.est_membre_ca()) with check (public.est_membre_ca());

create trigger journal_documents
after insert or update on documents
for each row execute function public.journaliser_modification();

-- (3) Demande de signature — statut piloté par le webhook DocuSeal
-- (`/api/docuseal/webhook`), jamais coché à la main comme l'aurait
-- imposé une solution sans API (pdf.24eme, écartée pour cette raison).
create table demandes_signature (
  id bigint generated always as identity primary key,
  document_id bigint not null references documents (id),
  statut text not null default 'en_attente' check (statut in ('en_attente', 'en_cours', 'complete', 'annulee')),
  docuseal_submission_id text,
  chemin_storage_signe text,
  cree_par_email text not null,
  cree_le timestamptz not null default now(),
  complete_le timestamptz
);
create index demandes_signature_document_idx on demandes_signature (document_id);

alter table demandes_signature enable row level security;
create policy "CA lecture demandes_signature" on demandes_signature for select using (public.est_membre_ca());
create policy "CA creation demandes_signature" on demandes_signature for insert with check (public.est_membre_ca());
create policy "CA modification demandes_signature" on demandes_signature for update using (public.est_membre_ca()) with check (public.est_membre_ca());

create trigger journal_demandes_signature
after insert or update on demandes_signature
for each row execute function public.journaliser_modification();

-- (4) Signataires d'une demande — email/nom en dur au moment de la
-- création (pas de FK vers `acces`, qui n'a pas de clé stable autre que
-- l'email et n'est jamais censée être référencée depuis une autre table).
create table demandes_signature_signataires (
  id bigint generated always as identity primary key,
  demande_id bigint not null references demandes_signature (id) on delete cascade,
  email text not null,
  nom text not null,
  email_envoye_le timestamptz,
  signe_le timestamptz
);
create index demandes_signature_signataires_demande_idx on demandes_signature_signataires (demande_id);

alter table demandes_signature_signataires enable row level security;
create policy "CA lecture demandes_signature_signataires" on demandes_signature_signataires for select using (public.est_membre_ca());
create policy "CA creation demandes_signature_signataires" on demandes_signature_signataires for insert with check (public.est_membre_ca());
create policy "CA modification demandes_signature_signataires" on demandes_signature_signataires for update using (public.est_membre_ca()) with check (public.est_membre_ca());

create trigger journal_demandes_signature_signataires
after insert or update on demandes_signature_signataires
for each row execute function public.journaliser_modification();

-- (5) Liste des signataires possibles — `acces` n'a aucune policy de
-- lecture cliente (0002_acces.sql), même contournement que
-- emails_avec_acces() (migration 0030) : une RPC étroite plutôt qu'ouvrir
-- la table. Exclut `masque` (compte admin technique, jamais un vrai
-- signataire du CA).
create or replace function public.signataires_ca()
returns table (email text, nom text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.est_membre_ca() then
    raise exception 'Action réservée au comité.';
  end if;

  return query
  select a.email, a.nom
  from public.acces a
  where (a.est_ca or a.est_admin) and not a.masque
  order by a.nom;
end;
$$;

revoke all on function public.signataires_ca from public;
grant execute on function public.signataires_ca to authenticated;
