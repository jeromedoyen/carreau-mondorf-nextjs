-- Phase 5 — première action d'écriture CA (saisie/édition d'une feuille de
-- match National D2). Trois volets : (1) colonne de suppression douce sur
-- parties_d2 (2) policies d'écriture réservées au CA (3) journal des
-- modifications automatique, requis avant toute action d'écriture (cf.
-- CLAUDE.md, "Exigence produit : audit des modifications").

-- (1) Suppression douce — même principe que enregistrerResultatRencontre_()
-- côté app d'origine (ChampionnatBackend.gs) : à chaque nouvelle saisie
-- d'une feuille de match, les anciennes parties de la rencontre sont
-- marquées supprimées plutôt qu'effacées, puis les nouvelles sont insérées.
-- N'existait pas encore ici car l'import initial (Phase 1) ne portait que
-- des données déjà nettoyées côté source, jamais de lignes supprimées.
alter table parties_d2 add column supprime boolean not null default false;

-- (2) Écriture réservée au CA — la lecture publique existante
-- ("lecture publique", 0001_init.sql) n'est pas touchée, ces policies ne
-- couvrent que l'écriture.
create policy "creation CA" on rencontres_d2 for insert with check (public.est_membre_ca());
create policy "modification CA" on rencontres_d2 for update using (public.est_membre_ca()) with check (public.est_membre_ca());

create policy "creation CA" on parties_d2 for insert with check (public.est_membre_ca());
create policy "modification CA" on parties_d2 for update using (public.est_membre_ca()) with check (public.est_membre_ca());
-- Pas de policy delete : suppression douce uniquement (colonne `supprime`),
-- jamais de DELETE réel — cohérent avec le "jamais de hard-delete" de
-- l'app d'origine.

-- (3) Journal des modifications — table générique + trigger réutilisable
-- pour toute table mutable future (registre membres, etc.), pas seulement
-- rencontres_d2/parties_d2. Lecture réservée au CA (utile pour un futur
-- écran d'historique) ; écriture uniquement via le trigger (security
-- definer), jamais directement par un client.
create table journal_modifications (
  id bigint generated always as identity primary key,
  table_cible text not null,
  ligne_id bigint not null,
  action text not null check (action in ('creation', 'modification', 'suppression')),
  avant jsonb,
  apres jsonb,
  auteur_email text not null,
  cree_le timestamptz not null default now()
);
create index journal_modifications_cible_idx on journal_modifications (table_cible, ligne_id);

alter table journal_modifications enable row level security;
create policy "lecture CA uniquement" on journal_modifications for select using (public.est_membre_ca());

create or replace function public.journaliser_modification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_auteur text := coalesce(auth.jwt()->>'email', 'service_role');
begin
  if (tg_op = 'INSERT') then
    insert into public.journal_modifications (table_cible, ligne_id, action, avant, apres, auteur_email)
    values (tg_table_name, new.id, 'creation', null, to_jsonb(new), email_auteur);
    return new;
  elsif (tg_op = 'UPDATE') then
    insert into public.journal_modifications (table_cible, ligne_id, action, avant, apres, auteur_email)
    values (tg_table_name, new.id, 'modification', to_jsonb(old), to_jsonb(new), email_auteur);
    return new;
  end if;
  return null;
end;
$$;

create trigger journal_rencontres_d2
after insert or update on rencontres_d2
for each row execute function public.journaliser_modification();

create trigger journal_parties_d2
after insert or update on parties_d2
for each row execute function public.journaliser_modification();
