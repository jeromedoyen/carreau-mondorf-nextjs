-- Garde-fous pour l'assistant "Caro" (28/07/2026, demande Jérôme) :
-- (1) une limite d'usage quotidienne par personne, pour ne pas épuiser le
-- palier gratuit Gemini si l'usage devient intensif ; (2) un journal des
-- questions posées, pour repérer où les licenciés se perdent réellement
-- dans l'app (diagnostic UX pour le CA, pas juste une aide pour eux).
-- Même principe que mon_adhesion()/mon_identite() : tables jamais
-- accessibles en écriture directe par le client, uniquement via des RPC
-- security definer scopées à la session courante.

create table assistant_utilisation (
  email text not null,
  jour date not null default current_date,
  compteur integer not null default 0,
  primary key (email, jour)
);
alter table assistant_utilisation enable row level security;
-- Aucune policy client : lecture/écriture uniquement via la RPC ci-dessous.

create or replace function public.verifier_et_incrementer_usage_assistant(p_limite integer default 40)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_session text;
  compteur_actuel integer;
begin
  email_session := lower(coalesce(auth.jwt()->>'email', ''));
  if email_session = '' then
    return false;
  end if;

  insert into public.assistant_utilisation (email, jour, compteur)
  values (email_session, current_date, 1)
  on conflict (email, jour) do update set compteur = public.assistant_utilisation.compteur + 1
  returning compteur into compteur_actuel;

  return compteur_actuel <= p_limite;
end;
$$;

revoke all on function public.verifier_et_incrementer_usage_assistant from public;
grant execute on function public.verifier_et_incrementer_usage_assistant to authenticated;

create table assistant_questions (
  id bigint generated always as identity primary key,
  email text not null,
  question text not null,
  cree_le timestamptz not null default now()
);
create index assistant_questions_cree_le_idx on assistant_questions (cree_le desc);

alter table assistant_questions enable row level security;
create policy "lecture CA uniquement" on assistant_questions for select using (public.est_membre_ca());

create or replace function public.journaliser_question_assistant(p_question text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  email_session text;
begin
  email_session := lower(coalesce(auth.jwt()->>'email', ''));
  if email_session = '' or trim(p_question) = '' then
    return;
  end if;
  insert into public.assistant_questions (email, question) values (email_session, left(p_question, 2000));
end;
$$;

revoke all on function public.journaliser_question_assistant from public;
grant execute on function public.journaliser_question_assistant to authenticated;
