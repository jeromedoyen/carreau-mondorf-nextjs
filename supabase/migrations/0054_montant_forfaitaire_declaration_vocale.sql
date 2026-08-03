-- Déclaration vocale : remboursement forfaitaire PAR PERSONNE (décision
-- de Jérôme, 03/08/2026, après le premier test) — "le remboursement par
-- personne est le montant enregistré dans l'application via l'outil dédié
-- à cette fonction", c'est-à-dire parametres_club.montant_remboursement_
-- concours (10 € aujourd'hui), modifiable depuis /outils/parametres.
--
-- Conséquences voulues :
--   * plus besoin que le vocal mentionne le prix d'inscription — c'était
--     la principale cause de relance par e-mail ;
--   * chaque joueur de l'équipe est remboursé pour lui-même, donc PAS de
--     montant nul sur les lignes "partenaire" comme pour un concours
--     saisi au formulaire (0049).
--
-- La saisie manuelle (source = 'manuel') n'est volontairement PAS touchée :
-- elle garde le remboursement au prix d'inscription réel, validé avec
-- Michel le 02/08/2026. Les deux modes de saisie divergent donc sur ce
-- point — à réconcilier si Jérôme veut le forfait partout.
create or replace function public.calculer_montant_participation_concours()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_montant_fixe numeric;
begin
  if new.hors_pays = true then
    new.montant_final := null;
    return new;
  end if;

  -- Tant que la déclaration attend des précisions, rien n'est remboursable :
  -- le montant reste nul, la ligne n'apparaît pas comme payable.
  if new.statut = 'a_clarifier' then
    new.montant_final := null;
    return new;
  end if;

  if new.type in ('Championnat_D2', 'Promotion', 'Concours_National') or new.source = 'vocal' then
    select montant_remboursement_concours into v_montant_fixe from public.parametres_club where id = 1;
    new.montant_final := v_montant_fixe;
  elsif new.type = 'Concours' then
    if new.chef_equipe_id is not null and new.personne_id <> new.chef_equipe_id then
      new.montant_final := null; -- partenaire : rien à virer directement
    elsif new.inscription_montant is not null then
      new.montant_final := case when new.repas_inclus then new.inscription_montant * 0.5 else new.inscription_montant end;
    end if;
  end if;

  return new;
end;
$$;

-- Le passage de 'a_clarifier' à 'en_attente' (réponse du licencié reçue)
-- doit recalculer le montant : sans ça, la ligne resterait à null après
-- résolution. L'ancien déclencheur ne surveillait pas la colonne statut.
drop trigger if exists trg_calculer_montant_participation_concours on participations_concours;
create trigger trg_calculer_montant_participation_concours
before insert or update of type, source, statut, hors_pays, inscription_montant, repas_inclus
on participations_concours
for each row execute function public.calculer_montant_participation_concours();
