-- Module "Demande d'organisation de manifestation" (04/08/2026) — remplace
-- la fiche papier "Protocole Manifestation" : tout membre autorisé
-- (est_utilisateur_autorise(), même périmètre que /manifestations) peut
-- remplir le formulaire, se signer lui-même (signataire unique = le
-- demandeur), puis la demande est transmise au CA. Réutilise le module
-- documents/demandes_signature (0033) plutôt que dupliquer le workflow
-- Documenso — mais ces tables sont CA-only en RLS, d'où la RPC security
-- definer ci-dessous plutôt qu'ouvrir leurs policies aux membres.

-- (1) Bucket dédié — séparé de documents-signature (CA-only) pour ne pas
-- toucher aux policies du bucket existant : chaque membre ne peut écrire
-- que dans son propre dossier (préfixe = son uid), lecture propriétaire +
-- CA.
insert into storage.buckets (id, name, public) values ('documents-protocole', 'documents-protocole', false);

create policy "Proprietaire ecriture documents-protocole" on storage.objects for insert
  with check (bucket_id = 'documents-protocole' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Proprietaire lecture documents-protocole" on storage.objects for select
  using (bucket_id = 'documents-protocole' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "CA lecture documents-protocole" on storage.objects for select
  using (bucket_id = 'documents-protocole' and public.est_membre_ca());

-- (2) Champs spécifiques au formulaire, en plus de documents/demandes_signature.
create table demandes_protocole_manifestation (
  id bigint generated always as identity primary key,
  demande_signature_id bigint not null references demandes_signature (id) on delete cascade,
  nom_prestation text not null,
  date_prestation date not null,
  responsables text not null,
  deroulement text not null,
  animations text,
  personnes_aidantes text,
  demandeur_email text not null,
  cree_le timestamptz not null default now()
);
create index demandes_protocole_manifestation_signature_idx on demandes_protocole_manifestation (demande_signature_id);

alter table demandes_protocole_manifestation enable row level security;
create policy "Proprietaire lecture demandes_protocole_manifestation" on demandes_protocole_manifestation
  for select using (demandeur_email = auth.jwt() ->> 'email');
create policy "CA lecture demandes_protocole_manifestation" on demandes_protocole_manifestation
  for select using (public.est_membre_ca());

create trigger journal_demandes_protocole_manifestation
after insert or update on demandes_protocole_manifestation
for each row execute function public.journaliser_modification();

-- (3) Le demandeur doit aussi pouvoir relire SA PROPRE ligne documents /
-- demandes_signature / demandes_signature_signataires (pour le suivi de
-- statut de sa signature) — ces tables restent CA-only en écriture, on
-- ajoute uniquement une policy de lecture "propriétaire".
create policy "Proprietaire lecture documents" on documents
  for select using (cree_par_email = auth.jwt() ->> 'email');
create policy "Proprietaire lecture demandes_signature" on demandes_signature
  for select using (cree_par_email = auth.jwt() ->> 'email');
create policy "Proprietaire lecture demandes_signature_signataires" on demandes_signature_signataires
  for select using (email = auth.jwt() ->> 'email');

-- (4) RPC security definer : crée document + demande_signature + signataire
-- unique (le demandeur lui-même, jamais un email arbitraire) + la ligne
-- protocole, dans une seule transaction. Retourne l'id de demande_signature
-- pour que le serveur puisse ensuite créer l'enveloppe Documenso.
create or replace function public.creer_protocole_manifestation(
  p_chemin_storage text,
  p_nom_prestation text,
  p_date_prestation date,
  p_responsables text,
  p_deroulement text,
  p_animations text,
  p_personnes_aidantes text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := auth.jwt() ->> 'email';
  v_nom text;
  v_document_id bigint;
  v_demande_id bigint;
begin
  if not public.est_utilisateur_autorise() then
    raise exception 'Action réservée aux membres autorisés.';
  end if;
  if v_email is null then
    raise exception 'Session invalide.';
  end if;

  select a.nom into v_nom from public.acces a where a.email = v_email;

  insert into public.documents (titre, chemin_storage, cree_par_email)
  values (p_nom_prestation, p_chemin_storage, v_email)
  returning id into v_document_id;

  insert into public.demandes_signature (document_id, cree_par_email)
  values (v_document_id, v_email)
  returning id into v_demande_id;

  insert into public.demandes_signature_signataires (demande_id, email, nom)
  values (v_demande_id, v_email, coalesce(v_nom, v_email));

  insert into public.demandes_protocole_manifestation (
    demande_signature_id, nom_prestation, date_prestation, responsables,
    deroulement, animations, personnes_aidantes, demandeur_email
  )
  values (
    v_demande_id, p_nom_prestation, p_date_prestation, p_responsables,
    p_deroulement, p_animations, p_personnes_aidantes, v_email
  );

  return v_demande_id;
end;
$$;

revoke all on function public.creer_protocole_manifestation from public;
grant execute on function public.creer_protocole_manifestation to authenticated;
