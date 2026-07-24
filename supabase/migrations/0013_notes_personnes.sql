-- Zone de commentaire libre sur une fiche Personne (pense-bête Jérôme,
-- 24/07/2026) : "pourquoi, qui, etc." — pas structuré, juste un texte libre
-- pour que le CA explique un cas particulier (ex. dérogation cotisation,
-- info sensible sur la situation du membre). Ajouté au niveau `personnes`
-- (pas `adhesions`) : c'est une note sur la personne elle-même, pas sur une
-- adhésion précise d'une année donnée. Schéma seulement pour l'instant —
-- l'écriture viendra avec l'UI d'édition du registre membres (Phase E),
-- pas encore construite ; la lecture (déjà réservée CA) en profite dès
-- maintenant.
alter table personnes add column notes text;
