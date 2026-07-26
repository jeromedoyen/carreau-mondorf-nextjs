-- Port de la fonctionnalité "Contrôle fédération FLBP" de la v1
-- (Code.gs : comparerFichierFederation/enregistrerImportFederation_,
-- Federation.html) : upload d'un fichier Excel fourni par la fédération,
-- comparaison avec le registre des licenciés du club, historique des
-- contrôles effectués. Remplace le contenu jusqu'ici affiché sous
-- "Fédération" en v2 (calendrier fédération — fonctionnalité différente,
-- déplacée sur /federation/calendrier, cf. commentaire dans le code).
create table controles_federation (
  id bigint generated always as identity primary key,
  saison text not null,
  date_import timestamptz not null default now(),
  nom_fichier text not null,
  nb_ok integer not null default 0,
  nb_divergence integer not null default 0,
  nb_manquant_club integer not null default 0,
  nb_manquant_federation integer not null default 0
);
create index controles_federation_saison_idx on controles_federation (saison);

alter table controles_federation enable row level security;

create policy "lecture CA" on controles_federation for select using (est_membre_ca());
create policy "creation CA" on controles_federation for insert with check (est_membre_ca());
-- Pas de update/delete : un historique de contrôles ne se corrige pas
-- après coup, il s'accumule (même principe que journal_modifications).
