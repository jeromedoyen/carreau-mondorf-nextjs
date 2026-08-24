-- Complète la journalisation du module Tournoi pour couvrir la SUPPRESSION
-- (24/08/2026) — l'exigence produit du 23/07/2026 dit explicitement « ajout,
-- modification, ou suppression », et 0059 n'avait câblé que les deux
-- premières. L'écran de modification d'un tournoi ajoute un vrai bouton de
-- suppression : c'est le moment de combler l'écart plutôt que de le laisser
-- traîner.
--
-- `journaliser_modification()` est une fonction PARTAGÉE (rencontres_d2,
-- parties_d2 l'utilisent déjà depuis 0005) : lui ajouter la branche DELETE ne
-- change rien pour ces tables tant qu'aucun trigger AFTER DELETE ne les vise —
-- c'est donc un ajout sûr, pas une modification de comportement existant.
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
  elsif (tg_op = 'DELETE') then
    insert into public.journal_modifications (table_cible, ligne_id, action, avant, apres, auteur_email)
    values (tg_table_name, old.id, 'suppression', to_jsonb(old), null, email_auteur);
    return old;
  end if;
  return null;
end;
$$;

-- `tournois` : la ligne de tête. Un trigger ne peut pas gagner un événement
-- par ALTER, on le remplace donc par un trigger couvrant les trois cas.
drop trigger journal_tournois on tournois;
create trigger journal_tournois
after insert or update or delete on tournois
for each row execute function public.journaliser_modification();

-- `tournoi_parties` : seule la suppression est journalisée ici — c'est
-- l'action destructrice introduite par `annulerDernierePartie()` (retire une
-- partie et tous ses scores). Sa création n'apporte rien de plus que ce que
-- `tournoi_rencontres` documente déjà une fois les scores saisis.
--
-- Un trigger AFTER DELETE se déclenche aussi pour chaque ligne retirée par un
-- ON DELETE CASCADE : supprimer un tournoi entier journalisera donc la ligne
-- `tournois` PLUS une ligne par partie qu'il contenait. C'est volontaire —
-- exact reflet de ce qui a disparu — pas un doublon à corriger.
create trigger journal_tournoi_parties_suppression
after delete on tournoi_parties
for each row execute function public.journaliser_modification();
