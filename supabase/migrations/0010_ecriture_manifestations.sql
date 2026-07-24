-- Phase B (2/2) — écriture sur manifestations/créneaux/affectations.
--
-- Accès en écriture réservé à "n'importe quel licencié autorisé"
-- (est_utilisateur_autorise()), PAS réservé au CA (est_membre_ca()) — fidèle
-- à v1 : createManifestation/createCreneau/addAffectation (Code.gs) ne
-- passent que par requireSession_(), jamais requireMembreCA_(). La gestion
-- des manifestations et l'inscription aux créneaux bénévoles sont ouvertes
-- à tout licencié dans l'app d'origine, contrairement à la saisie de
-- feuille de match (réservée au CA, cf. 0005_ecriture_ca.sql).
--
-- Pas de policy delete : suppression douce uniquement (colonne `supprime`
-- déjà posée en 0009), même principe que parties_d2.
create policy "creation licenciés" on manifestations for insert with check (est_utilisateur_autorise());
create policy "modification licenciés" on manifestations for update using (est_utilisateur_autorise()) with check (est_utilisateur_autorise());

create policy "creation licenciés" on creneaux for insert with check (est_utilisateur_autorise());
create policy "modification licenciés" on creneaux for update using (est_utilisateur_autorise()) with check (est_utilisateur_autorise());

create policy "creation licenciés" on affectations for insert with check (est_utilisateur_autorise());
create policy "modification licenciés" on affectations for update using (est_utilisateur_autorise()) with check (est_utilisateur_autorise());

-- Audit obligatoire (CLAUDE.md, "Exigence produit : audit des modifications")
-- — réutilise journaliser_modification() déjà défini en 0005_ecriture_ca.sql.
create trigger journal_manifestations
after insert or update on manifestations
for each row execute function public.journaliser_modification();

create trigger journal_creneaux
after insert or update on creneaux
for each row execute function public.journaliser_modification();

create trigger journal_affectations
after insert or update on affectations
for each row execute function public.journaliser_modification();
