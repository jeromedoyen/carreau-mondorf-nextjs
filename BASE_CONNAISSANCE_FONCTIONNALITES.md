# Base de connaissance — Application Carreau Mondorf v2

> Document de référence détaillé, page par page et fonctionnalité par fonctionnalité. Deux usages prévus : (1) socle pour rédiger un guide utilisateur complet, (2) contexte à donner à l'assistant Caro pour qu'elle réponde précisément à "à quoi sert cette page / cette fonctionnalité". Chaque entrée suit la même structure : **Route**, **Accès**, **Objectif**, **Description détaillée**, **Actions possibles**. Généré le 28/07/2026 à partir du code source réel — à régénérer si l'application évolue significativement.

---

## Concepts transverses (à connaître avant les pages)

**CA / comité** — Dans ce document et dans toute l'application, le sigle **"CA" signifie exclusivement "Conseil d'Administration"** (le comité directeur du club). **Ce n'est jamais une abréviation de "Canada"**, ni de rien d'autre — aucune des pages, tables ou fonctionnalités décrites ci-dessous n'a de rapport avec un pays. Un accès "CA" est déterminé par la table `acces` (colonnes `est_ca` ou `est_admin`), indépendamment du registre des membres.

**Saison active** — Une seule saison est marquée "active" à la fois (page `/saisons`). Elle détermine par défaut ce qui s'affiche sur Compétition, Manifestations, Congés, Membres, etc. Changer de saison affichée sur une page ne change pas la saison active du site.

**Statut de paiement** — Une adhésion comporte deux paiements distincts et indépendants : la **carte de membre** (cotisation) et la **licence** fédérale. Chacun a son propre statut payé/non payé, sa date et son montant. Le paiement se fait toujours par virement bancaire suite à un email "appel à cotisation" envoyé par le CA — jamais en ligne dans l'application.

**Licencié vs Membre non-licencié** — Le champ "Type" d'une adhésion distingue un licencié (inscrit à la fédération, a une licence) d'un simple membre du club non licencié.

**Catégories de créneaux bénévoles** — Cuisine, Bar, Table de marque, Service, Vaisselle, Barbecue, Préparation, Temps fort, Autre — chacune a une couleur dédiée, utilisée sur le planning visuel et le calendrier.

**Suppression douce** — Rien n'est jamais vraiment supprimé dans l'application (demandes de signature, questions à Caro...). Une colonne "supprime" masque l'élément des listes tout en gardant la trace dans le journal d'audit.

---

## Pages publiques (aucune connexion requise)

### `/` — Carte de visite (accueil)
**Accès** : public.
**Objectif** : premier contact avec le club pour un visiteur extérieur.
**Description** : page vitrine présentant le club, sans menu de navigation complet pour un visiteur non connecté (accueil épuré).
**Actions possibles** : accéder au formulaire d'inscription, se connecter si déjà licencié.

### `/club`
**Accès** : public.
**Objectif** : présentation complète du club — vitrine institutionnelle.
**Description détaillée** : en-tête avec logo, titre du club et baseline. Quatre boutons d'action : "S'inscrire au club", "Rejoindre notre groupe Facebook", "Nous écrire" (email), "Voir le boulodrome sur la carte". Section "Deux disciplines, un seul terrain" (Pétanque / Boules lyonnaises). Section "Infos pratiques" : adresse du boulodrome, siège social, montant de la cotisation annuelle, numéro RCS de l'association, email de contact. Section "Comment venir" avec itinéraires et distances depuis la France, l'Allemagne et la Belgique. Section "Le comité directeur" : photos, rôles et noms des membres du CA. Bandeau final invitant à rejoindre le groupe Facebook. Un lien de connexion discret est présent en bas de page.
**Actions possibles** : s'inscrire, contacter le club, calculer un itinéraire, se connecter.

### `/inscription`
**Accès** : public.
**Objectif** : rejoindre le club pour la première fois, ou se réinscrire après une interruption.
**Description** : formulaire couvrant deux cas — "Inscription" (nouvelle personne) et "Réinscription" (personne déjà connue du club mais inactive une ou plusieurs saisons). Recueille identité, coordonnées, type d'adhésion souhaité, consentements (règlement intérieur, données personnelles), droit à l'image. La demande atterrit dans une file d'attente que le CA valide sur `/membres/demandes` — rien n'est créé automatiquement en base.
**Actions possibles** : soumettre une demande d'inscription ou de réinscription.
**Ne pas confondre avec** : le paiement d'une cotisation d'un licencié déjà actif (qui passe par un email "appel à cotisation" + virement, pas ce formulaire).

### `/connexion`
**Accès** : public, page sans menu de navigation (le menu ne serait pas exploitable avant connexion).
**Objectif** : point d'entrée d'authentification.
**Description** : titre "Espace privé", texte explicatif ("Réservé aux licenciés, membres et comité du club. Entrez votre email, vous recevrez un code de connexion valable quelques minutes."), une illustration animée, et le formulaire de saisie d'email.
**Actions possibles** : demander un lien/code de connexion par email (authentification sans mot de passe).

---

## Pages licencié connecté

### `/moncaro` — tableau de bord personnel
**Accès** : tout licencié connecté.
**Objectif** : page d'atterrissage après connexion — voir sa propre situation en un coup d'œil.
**Description détaillée** : affiche la catégorie du licencié et deux pastilles de statut (carte de membre, licence) — verte si payé, rouge sinon, sans jamais afficher de montant en euros pour rester visuellement sobre. Inclut aussi un résumé de participation bénévole et, selon la saison, les statistiques de compétition (National D2 / Promotion) de la personne si elle est joueuse.
**Actions possibles** : consulter son statut, accéder au renouvellement d'adhésion (`/moncaro/renouveler`) si applicable.

### `/moncaro/renouveler`
**Accès** : licencié connecté.
**Objectif** : demander le renouvellement de son adhésion pour la saison active.
**Description** : formulaire préreempli avec les informations personnelles déjà connues (nom, coordonnées...), à vérifier/compléter avant soumission. Le texte explique : "le comité validera ta demande, puis un appel de paiement t'apparaîtra sur cette page."
**Actions possibles** : mettre à jour ses informations, soumettre une demande de renouvellement.

### `/calendrier` — calendrier unifié
**Accès** : licencié connecté.
**Objectif** : voir en un seul endroit tous les événements du club et de la fédération.
**Description détaillée** : combine matchs National D2, événements de la Promotion, tournois/calendrier fédération et manifestations internes du club. Fonctionne par filtres à cocher par catégorie (chip coloré par type d'événement) — **aucune catégorie n'est cochée par défaut**, rien ne s'affiche tant qu'on n'a pas choisi au moins une catégorie. Un bouton "Réinitialiser les filtres" ramène à cet état vide. Une fois un filtre choisi : une **liste chronologique** groupée par mois s'affiche en premier, suivie d'une **grille calendrier mensuelle** (avec navigation mois par mois, limitée aux mois à venir — pas de retour dans le passé) montrant des pastilles colorées par catégorie sur les jours concernés. Les jours déjà passés n'affichent plus de pastille dans la grille. Cliquer sur un jour de la grille contenant des événements affiche le détail (nom + catégorie) juste en dessous.
**Actions possibles** : filtrer par catégorie, naviguer mois par mois, consulter le détail d'un jour.

### `/benevole` — se proposer bénévole
**Accès** : licencié connecté.
**Objectif** : voir les événements où le club cherche encore des bénévoles et s'y inscrire.
**Description** : liste les manifestations à venir ayant des postes non pourvus, triées par date, avec le nombre de postes restants. Un lien "Mes participations" mène vers `/benevole/moi`.
**Actions possibles** : cliquer sur une manifestation pour voir le détail des postes (`/benevole/[id]`).

### `/benevole/[id]` — postes à pourvoir d'une manifestation
**Accès** : licencié connecté.
**Objectif** : détail des créneaux d'une manifestation précise, avec inscription.
**Description détaillée** : affiche tous les créneaux à pourvoir (tâche, catégorie en badge coloré, date, horaire), avec un badge "Tu y participes déjà" si l'utilisateur figure déjà parmi les bénévoles affectés à un créneau (mis en évidence visuellement). Bouton "Voir le planning complet" vers la vue planning de la manifestation.
**Actions possibles** : s'inscrire ou se désinscrire d'un créneau.

### `/benevole/moi` — mes participations
**Accès** : licencié connecté.
**Objectif** : historique et à venir de ses propres engagements bénévoles.
**Description** : liste des participations passées et futures de la personne connectée.

### `/manifestations/[id]/planning` — planning visuel
**Accès** : licencié connecté.
**Objectif** : vue d'ensemble visuelle (pas juste une liste) du planning d'une manifestation.
**Description** : grille horaire (7h-22h) avec des bandes colorées par catégorie de tâche, personnes affectées listées par créneau. Peut être exportée en PDF imprimable. Accessible aussi bien depuis `/manifestations/[id]` (vue CA) que `/benevole/[id]` (vue licencié).

### `/national-d2` — championnat National D2
**Accès** : public (pas de garde) pour le calendrier/classement ; les statistiques individuelles varient selon le rôle (voir ci-dessous).
**Objectif** : suivre les résultats et le classement du championnat.
**Description détaillée** : en-tête avec un sélecteur de saison, puis un bouton bascule "Calendrier & classement" / "Statistiques individuelles" (un seul bloc affiché à la fois, plus besoin de défiler). Le bloc calendrier montre le calendrier des rencontres du club et le classement complet de la division (les 7 clubs). Chaque rencontre déjà jouée (hors forfait) a une icône "œil" cliquable par tout visiteur, menant à `/national-d2/rencontres/[id]` en consultation. Le bloc statistiques : classement complet de tous les joueurs pour le CA et la commission sportive (rôle `est_membre_commission_sportive`, migration 0044) ; pour un licencié simple, uniquement ses propres statistiques (jamais le classement des autres) ; rien pour un membre non-licencié. Chaque ligne de joueur affiche aussi le ratio points marqués/partie jouée, en plus du total de points et du taux de victoire.

### `/national-d2/rencontres/[id]` — détail d'une rencontre
**Accès** : trois cas — CA (consultation + édition), CA/commission sportive ou joueur ayant participé à cette rencontre (consultation seule), sinon "Accès restreint".
**Objectif** : consulter et, pour le CA, enregistrer le résultat détaillé d'un match.
**Description** : le CA arrive par défaut sur une vue de consultation (structure des parties par phase avec une colonne points, et un récap "qui a marqué le plus" pour la journée), avec un bouton "Modifier le résultat" pour basculer vers la feuille de match éditable (compositions, scores par partie) et la déclaration de forfait — une rencontre pas encore jouée démarre directement en édition. Un joueur non-CA qui a participé à cette rencontre (nom reconnu via `parties_rencontre_d2`, migration 0046) voit la même vue de consultation, sans les outils d'édition. Un visiteur non concerné voit "Accès restreint".

### `/promotion` — championnat Promotion
**Accès** : public.
**Objectif** : consulter les résultats du championnat Promotion.
**Description** : saison 2025 uniquement — championnat clos, données historiques figées, pas de nouvelle saison possible sur ce module.

---

## Pages réservées au comité (CA)

Toutes les pages ci-dessous affichent "Réservé au comité" avec un bouton "Se connecter" pour tout visiteur non autorisé — la vérification se fait côté serveur à chaque chargement, jamais seulement côté affichage.

### `/membres` — registre des licenciés
**Objectif** : vue d'ensemble et gestion de tous les membres du club.
**Description** : liste complète des personnes enregistrées avec leur adhésion pour la saison affichée.
**Actions possibles** : ouvrir la fiche d'une personne, créer un nouveau membre.

### `/membres/[id]` — fiche membre
**Objectif** : consulter et modifier les informations d'une personne.
**Description détaillée** (formulaire `MembreForm`, partagé création/édition) : quatre sections — **Identité** (nom, prénom, sexe, date de naissance, nationalité), **Coordonnées** (adresse, code postal/ville, téléphone, email), **Adhésion {année}** (type — licencié / membre non-licencié —, catégorie, classe, numéro de licence, case "cotisation payée"), **Autres** (case "droit à l'image accordé", zone de notes libres). Si la fiche est ouverte depuis une demande d'adhésion validée, une section supplémentaire propose de créer l'accès de connexion de la personne et de lui envoyer un email de bienvenue.
**Actions possibles** : modifier les informations, enregistrer, créer l'accès de connexion.

### `/membres/demandes` — demandes d'inscription/réinscription
**Objectif** : traiter la file d'attente des demandes venues du formulaire public.
**Description** : liste des demandes en attente, avec pour chacune la possibilité de valider (crée ou met à jour la fiche membre, génère un appel "Carte de membre") ou de rejeter.

### `/membres/nouveau` — créer un membre
**Objectif** : ajouter manuellement une personne au registre, sans passer par le formulaire public.
**Description** : même formulaire que `/membres/[id]` mais en mode création.

### `/conges` — congés du comité
**Objectif** : suivre les disponibilités/indisponibilités des membres du CA.
**Description** : liste des congés déclarés, triés avec les congés déjà terminés repoussés en bas de liste et estompés visuellement.

### `/manifestations` — gestion des événements
**Objectif** : créer et piloter les manifestations du club.
**Description** : liste des manifestations, formulaire de création.

### `/manifestations/[id]` — détail d'une manifestation (vue CA)
**Objectif** : gérer les créneaux et bénévoles d'une manifestation précise.
**Description détaillée** : affiche nom, saison, statut, lieu, notes, puis la liste des créneaux (tâche, catégorie en badge, date, horaire) avec les bénévoles déjà affectés à chacun. Bouton vers la vue planning. Un formulaire permet d'ajouter un nouveau créneau.

### `/saisons` — gestion des saisons
**Objectif** : créer une nouvelle saison et définir laquelle est active.
**Description** : explique que la saison active détermine ce qui s'affiche par défaut sur tout le site (compétition, manifestations, congés, membres). Formulaire de création + liste des saisons existantes.

### `/federation` — contrôle fédération
**Objectif** : détecter les écarts entre le registre du club et les données officielles de la fédération (FLBP).
**Description** : compare le registre des licenciés à un fichier Excel officiel importé, pour repérer les différences (licence, catégorie, classe) et les licenciés manquants d'un côté ou de l'autre. Garde l'historique des contrôles déjà effectués.

### `/federation/calendrier` — calendrier fédéral (saisie)
**Objectif** : saisir les événements officiels de la fédération pour qu'ils apparaissent sur le calendrier public.
**Description** : formulaire d'ajout d'événements (tournois, championnats individuels, Coupe de Luxembourg, journées Promotion) pour la saison sélectionnée, et liste des événements déjà saisis. Ce qui est saisi ici alimente directement `/calendrier`.

### `/outils` — page d'atterrissage des outils
**Objectif** : point d'entrée unique vers tous les outils du CA.
**Description** : grille de blocs (icône + nom + description courte), 4 par ligne, un par outil listé ci-dessous.

### `/outils/paiements` — nouveaux appels à cotisation
**Objectif** : créer des demandes de paiement.
**Description** : formulaire de création d'un appel (type : carte de membre / licence / les deux — le montant se remplit automatiquement depuis les tarifs configurés), envoi par email au(x) destinataire(s) choisis. Ne conserve pas d'historique sur cette page (volontairement) — une fois envoyé, l'appel n'apparaît plus ici.

### `/outils/paiements-en-attente` — validation des paiements
**Objectif** : marquer les paiements reçus comme réglés.
**Description** : liste des appels en attente de règlement, action de validation qui synchronise automatiquement le statut vers la fiche d'adhésion de la personne (visible ensuite sur Mon Caro). Inclut aussi l'historique des paiements déjà validés.

### `/outils/renouvellement` — campagne de renouvellement
**Objectif** : relancer par email les anciens membres pour la saison suivante.
**Description** : cible toujours la saison active → la saison suivante (jamais l'inverse). Liste les personnes de la saison active n'ayant pas encore d'adhésion pour la saison suivante et disposant déjà d'un accès de connexion, avec un bouton d'envoi groupé.

### `/outils/fiches-membres` — fiches imprimables
**Objectif** : produire un classeur papier ou un export machine du registre, ou la fiche d'une seule personne à la demande.
**Description** : génère, pour la saison choisie, un classeur PDF (une fiche par personne, logo du club en en-tête, informations identité/coordonnées/adhésion/paiements), un export JSON, un export CSV, ou une archive ZIP regroupant les trois. Une seconde section permet de choisir une personne précise dans une liste déroulante et de générer uniquement sa fiche à la volée ; une fois générée, elle apparaît dans une liste avec deux actions : la télécharger, ou l'envoyer par email directement à cette personne (pièce jointe PDF).

### `/outils/statistiques-benevoles` — classement des bénévoles
**Objectif** : voir qui contribue le plus au bénévolat du club, et sur quoi.
**Description détaillée** : chiffres clés (participations totales, heures cumulées, nombre de membres vs externes), podium des 3 plus grands contributeurs, répartition par type de tâche et par manifestation (barres colorées), classement complet avec heures cumulées et date de dernière participation. Toutes saisons confondues (pas de filtre par année).

### `/outils/signatures` — signature électronique
**Objectif** : faire signer un document par une ou plusieurs personnes sans papier.
**Description détaillée** : dépôt d'un PDF, ajout des signataires (membres du CA ou saisie libre email/nom pour test), envoi via le service de signature électronique (positionnement automatique des zones de signature en bas de la dernière page du document, disposition adaptée au nombre de signataires). Suivi manuel de qui a signé (pas de notification automatique). Une fois complet, archivage automatique du PDF signé sur le Drive du club. Suppression douce possible d'une demande de test.

### `/outils/journal` — journal d'audit
**Objectif** : traçabilité complète des actions du CA.
**Description** : liste chronologique de qui a modifié quoi (table, avant/après, auteur, horodatage), filtrable par table concernée.

### `/outils/assistant-questions` — questions posées à Caro
**Objectif** : voir ce que les licenciés demandent réellement à l'assistant, pour repérer les points de confusion de l'application.
**Description** : liste des questions posées, avec suppression individuelle (soft-delete) et export JSON anonymisé (question + date, sans email ni nom) prévu pour être retransmis à des fins d'analyse.

---

## L'assistant Caro (fonctionnalité transversale, pas une page)

**Accès** : bulle flottante visible sur toutes les pages, pour tout licencié connecté uniquement.

**Ce que Caro sait faire** :
- Expliquer où trouver une fonctionnalité et comment l'utiliser (contenu de ce document).
- Donner la météo du jour à Mondorf-les-Bains (icône, températures min/max, probabilité de pluie).
- Répondre sur les données PERSONNELLES de la personne connectée (statut de cotisation, de licence, prénom) — jamais sur celles de quelqu'un d'autre, la base de données elle-même l'en empêche structurellement.
- Saluer par le prénom dans la langue associée à la nationalité déclarée, à l'ouverture du chat.

**Ce que Caro ne sait PAS faire** :
- Consulter le registre des membres, les résultats de matchs d'un tiers, ou toute donnée concernant une autre personne.
- Effectuer une action à la place de l'utilisateur (elle explique comment faire, elle ne le fait pas).
- Répondre sans limite : 40 messages par jour et par personne (protège le service gratuit utilisé).

**Fonctionnement technique** (utile si ce document sert de socle RAG) : Caro dispose de deux outils déclenchables automatiquement — `meteo` (météo du jour) et `mesInformations` (statut personnel de l'utilisateur connecté, via une fonction de base de données qui ne retourne jamais que la ligne de la session en cours). Toute question posée est journalisée (sans être associée publiquement à un contenu autre que l'email de l'auteur, visible seulement du CA sur `/outils/assistant-questions`).
