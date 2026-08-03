-- Forfait par personne pour TOUTES les participations (décision de Jérôme,
-- 03/08/2026 : "mets le forfait partout, même pour la saisie manuelle").
--
-- Règle unique désormais : chaque joueur présent à un concours est
-- remboursé du montant paramétré dans /outils/parametres
-- (parametres_club.montant_remboursement_concours, 10 € aujourd'hui),
-- quel que soit le type de compétition et le mode de saisie.
--
-- Ce que ça remplace, pour mémoire :
--   * le calcul au prix d'inscription réel, avec 50 % si le repas était
--     inclus (cahier des charges du 02/08/2026, §2) ;
--   * le versement au seul chef d'équipe à charge de redistribuer (0049),
--     qui laissait montant_final à null sur les lignes partenaire.
-- Chaque joueur est maintenant remboursé pour lui-même, y compris les
-- partenaires d'un concours saisi au formulaire.
--
-- Aucune reprise de données nécessaire : la table ne contenait aucune
-- ligne de type 'Concours' au moment de la migration (uniquement des
-- lignes 'auto' Promotion/Concours_National, déjà au forfait de 10 €).
-- Les colonnes inscription_montant / repas_inclus sont conservées mais
-- n'influencent plus aucun montant.
create or replace function public.calculer_montant_participation_concours()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_montant_fixe numeric;
begin
  -- Règle "hors pays" toujours non tranchée : montant laissé à null pour
  -- que la trésorerie le saisisse à la main, plutôt que d'appliquer par
  -- défaut un forfait qui n'a peut-être pas lieu d'être.
  if new.hors_pays = true then
    new.montant_final := null;
    return new;
  end if;

  -- Déclaration vocale encore incomplète : rien n'est remboursable tant
  -- que le licencié n'a pas répondu.
  if new.statut = 'a_clarifier' then
    new.montant_final := null;
    return new;
  end if;

  select montant_remboursement_concours into v_montant_fixe from public.parametres_club where id = 1;
  new.montant_final := v_montant_fixe;
  return new;
end;
$$;
