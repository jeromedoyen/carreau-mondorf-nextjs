-- 0078_journal_renommage_participant.sql — Tracer qui renomme un participant de tournoi (13/11/2026)
--
-- L'écran du tournoi permet désormais de corriger le nom d'un participant à
-- tout moment, y compris tournoi commencé (action `renommerParticipant()`).
-- L'exigence produit du 23/07/2026 dit que toute écriture CA doit laisser une
-- trace de qui a fait quoi : on branche donc le journal partagé
-- (`journaliser_modification()`, 0005 puis 0060) sur `tournoi_participants`.
--
-- Uniquement quand le NOM change. La table reçoit aussi des écritures qui ne
-- disent rien de plus que ce que le journal du tournoi documente déjà (le
-- club d'un joueur recopié depuis la feuille, 0077) : les journaliser noierait
-- les corrections de nom, seules à garder. Les ajouts et suppressions de
-- participants ne sont pas concernés non plus : `remplacerParticipants()`
-- vide et recrée toute la liste, une ligne de journal par joueur serait du
-- bruit.
--
-- Aucune table nouvelle, aucun droit nouveau : la fonction est celle des
-- autres tables journalisées, la politique RLS « CA tournoi_participants »
-- (FOR ALL) couvre déjà l'écriture.
create trigger journal_tournoi_participants_nom
after update on tournoi_participants
for each row
when (old.nom is distinct from new.nom)
execute function public.journaliser_modification();
