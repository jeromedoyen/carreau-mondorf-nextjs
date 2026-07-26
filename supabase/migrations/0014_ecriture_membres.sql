-- Phase E (1/2) — écriture sur le registre membres/licenciés. Réservé au
-- CA (est_membre_ca()), même niveau que la lecture déjà en place
-- (0004_registre_membres.sql) — cohérent avec le fait que ce module gère
-- des données personnelles RGPD-sensibles, contrairement aux modules
-- ouverts à tout licencié (manifestations).
--
-- Pas de policy delete : suppression douce uniquement (colonne `supprime`
-- déjà posée en 0004), même principe que les autres modules d'écriture.
create policy "creation CA" on personnes for insert with check (est_membre_ca());
create policy "modification CA" on personnes for update using (est_membre_ca()) with check (est_membre_ca());

create policy "creation CA" on adhesions for insert with check (est_membre_ca());
create policy "modification CA" on adhesions for update using (est_membre_ca()) with check (est_membre_ca());

-- Audit obligatoire (CLAUDE.md, "Exigence produit : audit des modifications")
-- — réutilise journaliser_modification() déjà défini en 0005_ecriture_ca.sql.
-- Particulièrement important ici : c'est la première table du projet à
-- contenir de vraies données personnelles modifiables (nom, adresse,
-- téléphone...), donc la traçabilité "qui a changé quoi" compte plus que
-- partout ailleurs.
create trigger journal_personnes
after insert or update on personnes
for each row execute function public.journaliser_modification();

create trigger journal_adhesions
after insert or update on adhesions
for each row execute function public.journaliser_modification();
