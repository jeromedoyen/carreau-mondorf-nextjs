-- Notes vocales captées via le bot Telegram (30/07/2026, demande Jérôme) :
-- remplace le dossier local ~/.minutes/demo/ comme unique source du
-- "pense-bête" vocal (/pb) — un service Render reçoit le webhook Telegram,
-- transcrit le vocal (faster-whisper, hors de cette app) et insère ici,
-- pour que la transcription démarre même quand le PC de Jérôme est éteint.
-- Même principe que assistant_utilisation/assistant_questions : table
-- interne, jamais exposée au client Next.js, accès uniquement via la clé
-- service_role (le service Render en écriture, /pb en lecture/mise à jour
-- de statut) — donc RLS activée mais aucune policy client.
create table notes_vocales (
  id bigint generated always as identity primary key,
  cree_le timestamptz not null default now(),
  texte text not null,
  duree_secondes integer,
  statut text not null default 'a_traiter' check (statut in ('a_traiter', 'traite')),
  traite_le timestamptz
);
create index notes_vocales_statut_idx on notes_vocales (statut, cree_le);

alter table notes_vocales enable row level security;
-- Aucune policy client : lecture/écriture réservées à la clé service_role.
