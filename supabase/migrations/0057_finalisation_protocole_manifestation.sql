-- Finalisation automatique du protocole manifestation après signature
-- (04/08/2026, demande Jérôme) : quand le demandeur revient sur l'app
-- après avoir signé côté Documenso, une RPC dédiée doit pouvoir marquer sa
-- propre demande "complete" — les policies UPDATE sur demandes_signature
-- restent CA-only (0033), donc même logique que
-- creer_protocole_manifestation : security definer plutôt qu'ouvrir la
-- table à l'écriture pour tout licencié.

create or replace function public.finaliser_protocole_signe(
  p_demande_signature_id bigint,
  p_chemin_storage_signe text,
  p_google_drive_file_id text
)
returns table (email text, nom text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := auth.jwt() ->> 'email';
  v_proprietaire text;
  v_lignes_maj int;
begin
  select ds.cree_par_email into v_proprietaire
  from public.demandes_signature ds
  where ds.id = p_demande_signature_id;

  if v_proprietaire is null then
    raise exception 'Demande introuvable.';
  end if;
  if v_proprietaire <> v_email and not public.est_membre_ca() then
    raise exception 'Action réservée au demandeur ou au comité.';
  end if;

  -- Idempotent : condition statut <> 'complete' fait qu'un second appel (ou
  -- un appel concurrent) ne met à jour aucune ligne, donc ne renvoie aucun
  -- destinataire — évite un e-mail en double au CA.
  update public.demandes_signature
  set statut = 'complete',
      complete_le = now(),
      chemin_storage_signe = coalesce(p_chemin_storage_signe, chemin_storage_signe),
      google_drive_file_id = coalesce(p_google_drive_file_id, google_drive_file_id)
  where id = p_demande_signature_id
    and statut <> 'complete';
  get diagnostics v_lignes_maj = row_count;

  if v_lignes_maj = 0 then
    return;
  end if;

  return query
  select a.email, a.nom
  from public.acces a
  where (a.est_ca or a.est_admin) and not a.masque
  order by a.nom;
end;
$$;

revoke all on function public.finaliser_protocole_signe from public;
grant execute on function public.finaliser_protocole_signe to authenticated;

-- Correctif (constaté en pratique, 04/08/2026) : creerEtSignerProtocole()
-- mettait à jour demandes_signature.statut/fournisseur_signature_id juste
-- après la création de l'enveloppe Documenso, via le client de session du
-- membre — bloqué silencieusement par la policy UPDATE CA-only (0033),
-- aucune erreur remontée (update() sans lignes correspondantes ne lève pas
-- d'exception côté Supabase). Résultat vérifié en base de test :
-- fournisseur_signature_id restait NULL, rendant tout suivi de statut
-- impossible. Même remède que ci-dessus : RPC security definer dédiée.
create or replace function public.marquer_protocole_envoye(
  p_demande_signature_id bigint,
  p_fournisseur_signature_id text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := auth.jwt() ->> 'email';
  v_proprietaire text;
begin
  select cree_par_email into v_proprietaire
  from public.demandes_signature
  where id = p_demande_signature_id;

  if v_proprietaire is null then
    raise exception 'Demande introuvable.';
  end if;
  if v_proprietaire <> v_email and not public.est_membre_ca() then
    raise exception 'Action réservée au demandeur ou au comité.';
  end if;

  update public.demandes_signature
  set statut = 'en_cours', fournisseur_signature_id = p_fournisseur_signature_id
  where id = p_demande_signature_id;

  update public.demandes_signature_signataires
  set email_envoye_le = now()
  where demande_id = p_demande_signature_id;
end;
$$;

revoke all on function public.marquer_protocole_envoye from public;
grant execute on function public.marquer_protocole_envoye to authenticated;
