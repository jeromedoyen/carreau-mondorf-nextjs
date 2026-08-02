-- Correction : pour un concours manuel, seul le chef d'équipe reçoit le
-- virement ("remboursement versé uniquement au chef d'équipe, à charge de
-- redistribuer à ses partenaires", cahier des charges §3) — la première
-- version du trigger (0047) calculait le même montant_final pour chaque
-- ligne (chef ET partenaires), ce qui aurait laissé croire que chacun est
-- payé séparément. Les lignes "partenaire" gardent montant_final = null
-- (rien à virer, juste une trace de participation servant à la
-- notification "tourne-toi vers ton chef d'équipe").
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

  if new.type in ('Championnat_D2', 'Promotion') then
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
