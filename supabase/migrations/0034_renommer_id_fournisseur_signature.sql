-- Colonne nommée pour DocuSeal (migration 0033), réutilisée pour
-- Documenso (27/07/2026) — renommée pour rester honnête sur son contenu
-- réel plutôt que de garder un nom qui ne correspond plus au fournisseur
-- utilisé.
alter table demandes_signature rename column docuseal_submission_id to fournisseur_signature_id;
