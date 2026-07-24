-- Phase C — congés/indisponibilités du CA. Port du modèle de
-- carreau-mondorf-app/Code.gs (SHEET_CONGES : Personne, Date début, Date
-- fin, Motif, Note, Créé par, Supprimé).
--
-- Contrairement aux manifestations (Phase B, ouvertes à tout licencié),
-- ce module est réservé au CA — cohérent avec le tableau d'accès de
-- CLAUDE.md ("Conges.html | CA — leave/unavailability"), même si la
-- fonction backend v1 (createConge/getConges) ne vérifie techniquement que
-- requireSession_() : on suit ici l'intention produit documentée, pas
-- l'implémentation la plus permissive.
--
-- `personne` reste en texte libre validé côté application contre la liste
-- fixe des membres du CA (MEMBRES_CA côté v1, portée en constante dans
-- src/lib/conges.ts côté v2) plutôt qu'une FK vers `acces` : ce n'est pas
-- l'identité de connexion qui compte ici mais le nom du membre concerné,
-- qui peut différer (ex. un autre membre du CA déclare le congé de
-- quelqu'un d'autre en réunion).
create table conges (
  id bigint generated always as identity primary key,
  saison text not null,
  personne text not null,
  date_debut date not null,
  date_fin date not null,
  motif text,
  note text,
  cree_par text,
  supprime boolean not null default false
);
create index conges_saison_idx on conges (saison);

alter table conges enable row level security;

create policy "lecture CA" on conges for select using (est_membre_ca());
create policy "creation CA" on conges for insert with check (est_membre_ca());
create policy "modification CA" on conges for update using (est_membre_ca()) with check (est_membre_ca());
-- Pas de policy delete : suppression douce uniquement (colonne `supprime`),
-- même principe que les autres modules d'écriture.

create trigger journal_conges
after insert or update on conges
for each row execute function public.journaliser_modification();
