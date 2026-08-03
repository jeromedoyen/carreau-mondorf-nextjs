-- Déclaration vocale d'une participation à un concours (idée Jérôme du
-- 03/08/2026, note Granola "Concours participation feature ideas") : le
-- chef d'équipe enregistre un vocal + un selfie depuis son téléphone au
-- lieu de remplir le formulaire de /concours, et l'app extrait ville,
-- concours, partenaires et montant d'inscription pour créer les mêmes
-- lignes que la saisie manuelle.
--
-- Aucun nouveau rôle : "chef d'équipe" reste asserté par la déclaration
-- elle-même (celui qui déclare l'est pour ce concours-là), exactement
-- comme creerParticipationManuelle() le fait déjà.

-- Nouvelle source, à côté de 'auto' (génération trésorerie) et 'manuel'
-- (formulaire). Distinguer 'vocal' permet de retrouver ces lignes en cas
-- de doute sur la qualité de l'extraction automatique.
alter table participations_concours drop constraint participations_concours_source_check;
alter table participations_concours add constraint participations_concours_source_check
  check (source in ('auto', 'manuel', 'vocal'));

-- 'a_clarifier' : l'extraction n'a pas tout résolu (partenaire non
-- reconnu, montant non dit...), un e-mail de relance est parti et on
-- attend la réponse du déclarant. Volontairement distinct de
-- 'en_attente', qui signifie déjà "en attente de paiement par la
-- trésorerie" — une ligne 'a_clarifier' ne doit PAS apparaître comme
-- payable dans /outils/remboursements.
alter table participations_concours drop constraint participations_concours_statut_check;
alter table participations_concours add constraint participations_concours_statut_check
  check (statut in ('a_clarifier', 'en_attente', 'valide', 'paye'));

-- Traçabilité de ce qui a produit la ligne : le texte transcrit tel quel,
-- ce que le modèle en a extrait, et le selfie de l'équipe. Sert autant à
-- la trésorerie (vérifier une ligne douteuse) qu'au diagnostic si
-- l'extraction se trompe régulièrement.
alter table participations_concours add column transcript text;
alter table participations_concours add column donnees_extraites jsonb;
alter table participations_concours add column photo_equipe_chemin text;

-- La RLS autorisait l'insertion aux licenciés pour la seule source
-- 'manuel' (0047) ; la vérification fine "chef = utilisateur courant"
-- reste faite côté Server Action, comme pour la saisie manuelle.
drop policy "creation manuelle par licencie" on participations_concours;
create policy "creation manuelle ou vocale par licencie" on participations_concours for insert with check (
  source in ('manuel', 'vocal') and public.est_utilisateur_autorise()
);

-- Dossier de relance : une ligne par déclaration vocale dont l'extraction
-- est incomplète. Le déclarant reçoit un e-mail dont le Reply-To porte le
-- jeton (concours+<jeton>@...), sa réponse revient par le webhook Resend
-- Inbound, et c'est ce jeton qui la raccroche au bon dossier.
create table declarations_vocales_clarification (
  id bigint generated always as identity primary key,
  jeton text not null unique,
  personne_declarant_id bigint not null references personnes (id),
  saison text not null,

  transcript text not null,
  donnees_extraites jsonb not null,
  -- Ce qui manque encore, sous la forme [{champ, question}] — repassé au
  -- modèle à la réception de la réponse pour qu'il sache quoi y chercher.
  ambiguites jsonb not null,
  photo_equipe_chemin text,

  statut text not null default 'en_attente_reponse'
    check (statut in ('en_attente_reponse', 'resolu', 'abandonne')),
  -- Plafonné côté application (2 max) : sans ça, une réponse toujours
  -- ambiguë relancerait indéfiniment le déclarant.
  relances integer not null default 0,
  reponse_brute text,
  participations_ids bigint[],

  email_envoye_le timestamptz not null default now(),
  reponse_recue_le timestamptz,
  cree_le timestamptz not null default now()
);
create index declarations_vocales_clarification_declarant_idx
  on declarations_vocales_clarification (personne_declarant_id);

-- Aucune policy client : ces dossiers ne sont lus/écrits que par le
-- webhook e-mail entrant, via la clé service-role (même approche que les
-- autres traitements serveur-à-serveur). RLS activée pour que rien ne
-- passe par la clé publique.
alter table declarations_vocales_clarification enable row level security;

-- Le webhook n'a pas de session utilisateur : il retrouve le dossier par
-- son seul jeton. Security definer + filtre sur le statut pour qu'un
-- jeton déjà résolu ne rouvre rien.
create or replace function public.dossier_clarification_par_jeton(p_jeton text)
returns declarations_vocales_clarification
language sql
security definer
set search_path = ''
as $$
  select * from public.declarations_vocales_clarification
  where jeton = p_jeton and statut = 'en_attente_reponse';
$$;

-- Selfies d'équipe. Bucket privé (même principe que documents-signature,
-- 0033) : jamais d'URL publique, lecture par URL signée générée côté
-- serveur après vérification.
insert into storage.buckets (id, name, public) values ('photos-concours', 'photos-concours', false);

-- Chaque licencié dépose dans son propre dossier (concours/<son id>/...),
-- ce que cette policy impose réellement : le préfixe du chemin doit être
-- l'id de personne de la session. Empêche de déposer sous l'identité d'un
-- autre membre.
create policy "depot photo concours par licencie" on storage.objects for insert
  with check (
    bucket_id = 'photos-concours'
    and public.est_utilisateur_autorise()
    and (storage.foldername(name))[2] = public.mon_id_personne()::text
  );

-- Lecture : la trésorerie pour contrôler une déclaration, et le déposant
-- pour revoir sa propre photo. Les partenaires passent par l'URL signée
-- générée côté serveur, pas par un accès direct au bucket.
create policy "lecture photo concours" on storage.objects for select
  using (
    bucket_id = 'photos-concours'
    and (
      public.est_membre_tresorerie()
      or (storage.foldername(name))[2] = public.mon_id_personne()::text
    )
  );
