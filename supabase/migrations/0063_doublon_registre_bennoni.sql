-- Correction de données (21/09/2026) — deux fiches pour la même personne
-- dans `personnes`, mises au jour par la clé de rapprochement introduite
-- en 0061 pour le tableau de bord individuel :
--
--   id 5  (P-5)  BENNONI « Gaia »  — fiche complète : date de naissance,
--                nationalité, adresse, téléphone, e-mail, droit à l'image,
--                et une adhésion 2026 de type « Licencié »
--   id 68 (P-68) BENNONI « Gaïa »  — nom seul. Aucune autre colonne
--                renseignée, aucune adhésion, aucune référence nulle part
--
-- Vérifié avant écriture : les sept clés étrangères pointant vers
-- `personnes` (adhesions, appels_paiement, demandes_adhesion,
-- participations_concours ×2, tournoi_participants,
-- declarations_vocales_clarification) ne comptent aucune ligne pour l'id
-- 68 ; et un balayage des 146 colonnes texte de la base ne trouve « Gaïa
-- BENNONI » nulle part ailleurs — ni dans `affectations.nom`, qui désigne
-- pourtant les bénévoles par un nom libre, ni dans `acces`, qui ne porte
-- que « Gaia BENNONI » rattachée à gbennoni@gmail.com, donc à l'id 5.
--
-- Suppression douce (`supprime = true`), jamais de DELETE : c'est la
-- convention du projet sur toutes les données de registre, et elle laisse
-- la trace réversible qu'exige une donnée RGPD.
--
-- ⚠️ L'orthographe du prénom n'est PAS modifiée sur la fiche conservée.
-- Laquelle des deux graphies est la bonne — « Gaia » ou « Gaïa » — n'est
-- pas déterminable depuis la base : la fiche vide n'est pas une preuve, et
-- corriger le prénom de quelqu'un sur une intuition serait pire que de le
-- laisser tel quel. À trancher avec la personne concernée.

update public.personnes
   set supprime = true,
       notes = coalesce(notes || ' | ', '')
               || 'Fiche en double de la personne id 5 (BENNONI Gaia), '
               || 'archivée le 21/09/2026 : aucune donnée propre, aucune adhésion, '
               || 'aucune référence. Voir migration 0063.'
 where source_id = 'P-68'
   and supprime = false
   -- Garde-fous : on n'archive que si la fiche est bien restée vide et
   -- sans rattachement. Si quoi que ce soit y a été ajouté entre-temps,
   -- la migration ne fait rien plutôt que de détruire ce travail.
   and prenom = 'Gaïa'
   and nom = 'BENNONI'
   and email is null
   and telephone is null
   and adresse is null
   and date_naissance is null
   and not exists (select 1 from public.adhesions a where a.personne_id = personnes.id)
   and not exists (select 1 from public.participations_concours p
                    where p.personne_id = personnes.id or p.chef_equipe_id = personnes.id)
   and not exists (select 1 from public.demandes_adhesion d where d.personne_id = personnes.id)
   and not exists (select 1 from public.appels_paiement ap where ap.personne_id = personnes.id)
   and not exists (select 1 from public.tournoi_participants tp where tp.personne_id = personnes.id);
