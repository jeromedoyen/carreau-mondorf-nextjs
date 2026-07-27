-- Retour Jérôme (27/07/2026) : créer un appel de paiement ne suffit pas,
-- il faut pouvoir envoyer la demande par email à la personne. Une fois
-- l'email envoyé, l'appel bascule visuellement dans une seconde liste
-- ("relances envoyées") pendant que le trésorier confirme les paiements
-- au fil de l'eau — un appel jamais relancé (paiement en main propre + QR
-- flashé sur place) reste dans la première liste où il peut être marqué
-- payé directement, sans jamais passer par l'email.
alter table appels_paiement add column email_envoye_le timestamptz;
