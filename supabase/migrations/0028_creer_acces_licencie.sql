-- Phase A du workflow adhésion (27/07/2026) : à la validation d'une
-- demande d'inscription, le CA doit pouvoir créer l'accès de connexion du
-- nouveau membre. `acces` n'a jamais eu de policy d'écriture cliente
-- (0002_acces.sql : "aucun accès direct depuis le client", volontaire —
-- cette table est l'allowlist de connexion, pas une table de contenu
-- ordinaire) — plutôt que d'ouvrir une policy INSERT large, une RPC dédiée
-- qui vérifie elle-même est_membre_ca() en interne, même principe que le
-- reste de ce fichier de migrations (mon_nom_benevole, est_licencie...).
create or replace function public.creer_acces_licencie(p_email text, p_nom text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.est_membre_ca() then
    raise exception 'Action réservée au comité.';
  end if;

  insert into public.acces (email, nom, est_ca, est_admin, masque)
  values (lower(trim(p_email)), p_nom, false, false, false)
  on conflict (email) do update set nom = excluded.nom;

  return true;
end;
$$;

revoke all on function public.creer_acces_licencie from public;
grant execute on function public.creer_acces_licencie to authenticated;
