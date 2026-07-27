-- Moncaro : un licencié doit pouvoir générer son propre QR de paiement
-- (bouton "Payer" sur sa carte de cotisation), donc lire les coordonnées
-- bancaires du club — jusqu'ici réservées au CA (0021_paiements.sql), car
-- seul l'écran CA /outils/paiements existait à l'époque. Pas une donnée
-- sensible (un IBAN est fait pour être communiqué), donc une deuxième
-- policy SELECT permissive plutôt que remplacer la première : les deux se
-- combinent en OR (RLS Postgres), le CA garde son accès existant.
create policy "lecture licenciés" on parametres_club for select using (public.est_utilisateur_autorise());
