-- Durcissement (27/07/2026, suite audit sécurité) — la policy d'insertion
-- anonyme sur demandes_adhesion (0015_demandes_adhesion.sql) était
-- `with check (true)` : un visiteur anonyme pouvait insérer une ligne en
-- fixant lui-même `statut` (ex. 'validee') ou `personne_id` (en pointant
-- vers un membre existant), alors que le formulaire public ne doit jamais
-- pouvoir soumettre qu'une demande brute, non traitée, sans lien vers une
-- personne. Remplace la policy pour forcer ces deux colonnes à leur valeur
-- de départ légitime — la RLS INSERT permet de contraindre les valeurs de
-- la ligne, pas seulement d'autoriser/refuser l'opération.

drop policy "soumission publique" on demandes_adhesion;

create policy "soumission publique" on demandes_adhesion for insert to anon
  with check (statut = 'a_traiter' and personne_id is null);
