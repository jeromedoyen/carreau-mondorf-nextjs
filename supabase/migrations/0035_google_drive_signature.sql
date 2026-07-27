-- Phase 3 du plan d'origine (27/07/2026) : archivage du PDF signé sur le
-- Google Drive du club une fois la demande complétée.
alter table demandes_signature add column google_drive_file_id text;
