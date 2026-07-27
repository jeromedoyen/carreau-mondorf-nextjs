-- Pense-bête 27/07/2026 :
-- (1) le CA doit pouvoir définir lui-même les montants (carte de membre,
--     licence) plutôt qu'un montant fixe en dur dans le code
--     (MONTANT_COTISATION = 20 dans src/lib/actions/demandes.ts) ;
-- (2) le type d'appel "Cotisation" est renommé en libellés plus clairs :
--     "Carte de membre" / "Licence" / "Carte de membre + Licence" (pour un
--     appel unique couvrant les deux, même logique que le bouton "Payer"
--     de Moncaro qui additionne déjà les deux montants restant dus).

-- (1) Tarifs configurables — même ligne unique que le reste de
-- parametres_club (id=1). Nullable : la licence en particulier est fixée
-- par la FLBP (fédération) et peut ne pas être connue au moment du
-- déploiement de cette migration.
alter table parametres_club add column montant_carte_membre numeric;
alter table parametres_club add column montant_licence numeric;
update parametres_club set montant_carte_membre = 20 where id = 1;

-- (2) Renomme les types existants avant de resserrer la contrainte
-- (l'ordre compte : la contrainte actuelle n'autorise pas encore
-- "Carte de membre").
alter table appels_paiement drop constraint appels_paiement_type_check;
update appels_paiement set type = 'Carte de membre' where type = 'Cotisation';
alter table appels_paiement add constraint appels_paiement_type_check
  check (type in ('Carte de membre', 'Licence', 'Carte de membre + Licence', 'Autre'));

-- Préfixes de référence mis à jour en conséquence (CDM/CML remplacent
-- l'ancien COT) — les références déjà générées (COT-14 etc.) ne sont pas
-- rétroactivement renommées, seules les nouvelles suivent le nouveau
-- schéma.
create or replace function public.generer_reference_appel_paiement()
returns trigger
language plpgsql
as $$
declare
  prefixe text;
begin
  prefixe := case new.type
    when 'Carte de membre' then 'CDM'
    when 'Licence' then 'LIC'
    when 'Carte de membre + Licence' then 'CML'
    else 'AUT'
  end;
  new.reference := prefixe || '-' || new.id;
  return new;
end;
$$;
