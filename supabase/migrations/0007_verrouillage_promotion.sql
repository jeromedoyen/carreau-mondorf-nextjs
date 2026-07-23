-- Réserve tout le module Promotion (calendrier + statistiques) aux
-- licenciés connectés — décision explicite de Jérôme (option "b") après le
-- reverrouillage des statistiques D2 (0006_verrouillage_stats.sql) : plutôt
-- que d'accepter l'asymétrie "D2 verrouillé / Promotion public", il a choisi
-- d'aligner la Promotion sur le même niveau d'accès que l'app d'origine
-- ("Lecture : tout licencié" pour tout le module Compétition, cf.
-- Competition.html côté carreau-mondorf-app).
--
-- Utilise est_utilisateur_autorise() (0003_role_ca.sql) — pas
-- est_membre_ca() : n'importe quel compte de `acces` suffit, pas seulement
-- le CA. Rappel : ce n'est qu'une approximation de "licencié" au sens
-- sportif du terme (`acces` est la liste d'autorisation de connexion, pas
-- le registre membres) — la vraie distinction viendra avec le futur
-- est_licencie() basé sur adhesions.type, une fois le registre importé.
drop policy "lecture publique" on promotion_equipes;
create policy "lecture licenciés" on promotion_equipes for select using (public.est_utilisateur_autorise());
