-- RPC publique exposant uniquement les deux montants de parametres_club
-- (29/07/2026, demande Jérôme) — nécessaire pour afficher le vrai montant
-- de cotisation sur la page publique /club (visiteur anonyme, jamais
-- connecté) sans ouvrir tout `parametres_club` (IBAN inclus) à un
-- anonyme : la policy "lecture licenciés" (0027) ne couvre que les
-- utilisateurs connectés/autorisés. Security definer, aucune vérification
-- d'accès (les deux montants ne sont pas sensibles), même esprit que
-- signataires_ca()/mon_identite() : une RPC étroite plutôt qu'élargir la
-- policy de la table entière.
create or replace function public.montants_club()
returns table (montant_carte_membre numeric, montant_licence numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select montant_carte_membre, montant_licence
  from public.parametres_club
  where id = 1;
$$;

revoke all on function public.montants_club from public;
grant execute on function public.montants_club to anon, authenticated;
