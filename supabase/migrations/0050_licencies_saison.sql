-- Liste des licenciés d'une saison (id + nom) — nécessaire pour que le
-- chef d'équipe (un licencié quelconque, pas CA) puisse sélectionner ses
-- partenaires par identifiant réel lors de la saisie manuelle d'un
-- concours (module remboursements v2). `personnes` reste CA-only en
-- lecture directe (RGPD) — cette fonction n'expose que id/nom/prénom,
-- rien de plus sensible (adresse, téléphone, etc.), et uniquement pour
-- les licenciés de la saison demandée.
create or replace function public.licencies_saison(p_saison text)
returns table (id bigint, nom text, prenom text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.nom, p.prenom
  from public.personnes p
  join public.adhesions a on a.personne_id = p.id
  where a.annee = p_saison
    and a.type = 'Licencié'
    and a.supprime = false
    and p.supprime = false
  order by p.prenom, p.nom;
$$;

revoke all on function public.licencies_saison from public;
grant execute on function public.licencies_saison to authenticated;
