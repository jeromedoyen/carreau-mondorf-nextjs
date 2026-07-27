-- Correction de données (27/07/2026, suite audit) — trois membres du CA
-- (Marie-Jean FLAMMANG, Marco BERTEMES, Oswaldo BRUNETTA, listés dans
-- MEMBRES_CA côté v1) existaient dans `acces` mais avec est_ca = false,
-- validé avec Jérôme avant correction.

update acces set est_ca = true
where email in ('mariejeanflammang@gmail.com', 'bertemem@pt.lu', 'yvosfe@pt.lu');
