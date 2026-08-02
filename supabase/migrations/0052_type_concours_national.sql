-- Ajoute le type "Concours_National" (championnat national individuel FLBP
-- — Triplettes mixtes, Tête-à-tête... calendrier_federation, catégorie
-- "Championnat national") : traité comme Championnat_D2/Promotion, montant
-- fixe par joueur, PAS de chef d'équipe (demande explicite de Jérôme,
-- 02/08/2026, lors de l'import des données historiques fournies par
-- Michel : "on comptabilise le remboursement de façon individuelle").
alter table participations_concours drop constraint participations_concours_type_check;
alter table participations_concours add constraint participations_concours_type_check
  check (type in ('Championnat_D2', 'Promotion', 'Concours_National', 'Concours'));

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

  if new.type in ('Championnat_D2', 'Promotion', 'Concours_National') then
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
