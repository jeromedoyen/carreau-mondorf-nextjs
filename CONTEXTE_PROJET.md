# Contexte du projet — Reconstruction Next.js (Carreau Mondorf — Compétition)

Ce fichier résume l'état complet de ce projet pour reprendre le travail sans perdre le contexte accumulé. **À lire en entier avant toute modification.** Écrit pour amorcer une nouvelle conversation à contexte léger — voir aussi `carreau-mondorf-app/CLAUDE.md` et `carreau-mondorf-app/CONTEXTE_PROJET.md` pour le projet frère (l'application de référence, en production).

Dernière mise à jour : **23/09/2026** — **Promotion 2026** : les deux seules feuilles de journée publiées par la FLBP (J6 et J10) sont en base, et l'application dit désormais clairement qu'il s'agit de 2 journées sur 10 ; `/promotion` n'est plus figée sur 2025. **Fusionné et déployé** (PR #23), vérifié en production. Puis **table de classement Promotion** (0066) : classements officiels J6/J8/J10 et points des quatorze clubs à chaque journée, affichés dans un onglet « Classement » — Carreau Mondorf finit 8e sur 14 ; J5 datée du 09/05 comme le calendrier (0067). **Fusionné et déployé** (PR #25). La J14 de National D2 n'est toujours pas publiée. Le 22/09 : **tableau de bord individuel du licencié** livré sur `/moncaro`, avec sa vue comité depuis une fiche membre. Deux correctifs de fond au passage : un rapprochement de noms qui ne rapprochait rien, et un bilan qui affichait celui d'un coéquipier. La veille : journée 14 saisie, **Carreau Mondorf champion de National D2 2026**. Les sections datées des 21, 22 et 23/09, en fin de fichier, détaillent tout.

Connexion : **OTP à 6 chiffres saisi manuellement** — un essai de lien magique a eu lieu entre le 27/07 et le 01/08/2026 et a été intégralement annulé par Jérôme, voir section dédiée.

### Où en est le projet, en une lecture

⚠️ **Les sections « Feuille de route » et « Périmètre non couvert » ci-dessous datent du 22/07/2026 et sont largement dépassées.** Elles restent en place parce qu'elles gardent trace des décisions prises ce jour-là, mais **ne pas s'y fier pour savoir ce qui existe** — s'en tenir à ce qui suit, et aux sessions datées en fin de fichier.

Ce n'est plus un prototype en lecture seule : l'application est **authentifiée** (OTP), écrit en base, et couvre bien au-delà du module Compétition. **44 routes, 67 migrations, 101 composants.** Parmi les routes : `/national-d2` et `/promotion` (compétition), `/membres` (registre licenciés), `/manifestations` et `/benevole` (événements et bénévolat), `/conges`, `/concours` (déclaration de participation, dont vocale et assistée par IA), `/moncaro` (espace personnel du licencié), `/federation`, et quatorze écrans `/outils` réservés au CA — paiements, remboursements, renouvellements, signatures Documenso, tournoi, statistiques.

**`/moncaro` est un vrai tableau de bord depuis le 21/09** : en-tête avec distinctions méritées, bandeau d'indicateurs, et quatre onglets (Ma saison, Championnat, Promotion, Ma vie de club), avec sélecteur de saison. Le comité peut consulter celui de n'importe quel membre par trois chemins : l'icône sur une ligne du registre, le bouton sur sa fiche, ou le lien au bas de son panneau dans le classement individuel.

Déploiement : push sur `main` → build Vercel → `https://carreau-mondorf-nextjs.vercel.app`.

**Saison D2 2026 close.** Les 14 journées sont en base, 12 rencontres détaillées partie par partie, 18 joueurs.

### Les trois chantiers ouverts, par ordre d'utilité

1. **Résultats Promotion 2026 — couverts autant que la FLBP le permet depuis le 23/09.** Trios de Mondorf : **2 feuilles de journée sur 10** (J6 et J10), c'est tout ce qui est publié. Classement des clubs : **complet** (0066), J9 déduite. Reste le calendrier fédéral 2025, vide, qui prive la saison 2025 de son bandeau de couverture.
2. **Convocations** — la table n'existe pas. Sans elle, pas de taux de présence réel ni de prochaines échéances ; le tableau de bord se rabat sur « journées jouées / rencontres disputées », exact mais différent. Structure proposée en fin de fichier. **Décision de fonctionnement du club avant d'être technique.**
3. **Aucun harnais de test** — le défaut du 22/09, qui affichait le bilan d'un coéquipier, aurait été attrapé par trois lignes d'assertion.

Reliquat de données : les **trois lignes de poule de la J14** (Lasauvage–Schieren, Belvaux–Steinfort, exempt Steinheim). Revérifié le 23/09 **sur la page elle-même** (et via la médiathèque WordPress) : la FLBP n'a toujours publié que jusqu'à la J13. Le titre n'en dépend pas, c'est démontré en fin de fichier.

## Session du 24/07/2026 — Phases 0 à D de la feuille de route

Feuille de route en 6 phases décidée avec Jérôme (objectif : solide en septembre 2026, formation CA/bénévoles nov-déc, opérationnel saison 2027, vision historique année par année sur tous les modules) :

- **Phase 0 (fondations)** : table `saisons` transversale (0008_saisons.sql) + `SaisonSwitcher` réutilisable, pilotée sur `/national-d2`. Refonte navigation : desktop avec indicateur d'état actif (`NavLinks.tsx`), mobile remplace le menu hamburger par une barre fixe en bas d'écran façon app (`BottomNav.tsx`, 5 destinations max, cibles tactiles 44px+, `env(safe-area-inset-bottom)`).
- **Phase A** : `/club`, carte de visite publique — port fidèle du contenu réel de `carreau-mondorf-app/CarteVisite.html` (disciplines, infos pratiques, itinéraires 4 frontières, comité avec photos). Pas de multilingue dans cette v2 (l'original en a 5 : FR/LB/DE/EN/IT) — **décision explicite de Jérôme : reporté, pas abandonné**, à reprendre plus tard.
- **Phase B** : `/manifestations`, gestion complète (créer événement, créneaux, s'inscrire/se désinscrire comme bénévole) — ouvert à tout licencié connecté (`est_utilisateur_autorise()`), pas réservé au CA, fidèle à v1 (`Code.gs`). Migrations 0009 (lecture) + 0010 (écriture + audit).
- **Phase C** : `/conges`, congés/indisponibilités du CA — réservé CA (`est_membre_ca()`). Migration 0011.
- **Phase D** : `/federation`, gestion du calendrier fédération par le CA — en v1 ce calendrier n'avait jamais eu de vraie fonction de chargement (juste un seed écrit à la main par Claude à partir d'un PDF, exécutable seulement depuis l'éditeur Apps Script) ; maintenant le CA peut créer/retirer les événements en autonomie, saison après saison. Migration 0012.

**Git push autonome activé** : Jérôme a installé GitHub Desktop, `credential.helper=manager` + `credential.credentialStore=wincredman` configurés globalement → Claude committe ET pousse directement depuis cette session, plus besoin de demander à Jérôme de le faire (testé et confirmé, commit `f456b4f`).

Chaque migration (0008 à 0012) a été appliquée manuellement par Jérôme dans le SQL Editor Supabase au fil de la session, comme d'habitude (pas de CLI Supabase configurée).

### ⚠️ Connexion réelle jamais validée de bout en bout — diagnostic en cours

Le flux magic-link a été basculé de PKCE vers `flowType: 'implicit'` (session précédente, 22-23/07) pour éliminer la dépendance au cookie `code_verifier` du navigateur d'origine. Testé aujourd'hui : la demande de lien fonctionne bien côté app (confirmé par interception directe du fetch vers `/auth/v1/otp` : réponse `200 {}`, donc Supabase accepte la requête), mais :

1. **Un email a mis longtemps à arriver / n'est jamais arrivé** certaines fois — cause probable : le mailer par défaut Supabase a un quota très bas (quelques envois/heure, projet entier confondu), déjà suspecté par Jérôme ("quota des 2 connexions par heure"). Plusieurs tentatives cumulées dans une même session épuisent vite ce quota, sans que l'API ne renvoie d'erreur explicite (elle répond 200 même si l'envoi réel est ensuite freiné/droppé côté mailer).
2. **Un email reçu a bien été cliqué, résultat : `/connexion?erreur=lien_invalide&diag_fragment=false`** — le fragment `#access_token=...` était absent à l'arrivée sur `/auth/confirm`. Un diagnostic temporaire plus poussé vient d'être ajouté dans `src/app/auth/confirm/page.tsx` (capture aussi `?error=`/`?error_code=`/`?error_description=` que Supabase peut mettre dans l'URL en cas de token déjà utilisé/expiré — le premier diagnostic ne les voyait pas). **Pas encore retesté avec ce diagnostic amélioré** — prochaine étape à la reprise, une fois le quota mailer disponible.

Deux hypothèses réelles restent ouvertes, à départager avec le prochain test : (a) le mailer par défaut Supabase a un problème de fiabilité de livraison indépendant du flow OAuth (b) le lien est bien livré mais perd son fragment en route (client mail qui réécrit les liens) ou est consommé avant le clic (scanner de sécurité). Si le problème persiste après ce diagnostic, envisager un vrai fournisseur SMTP fiable (pas Brevo, jamais résolu — voir plus bas) plutôt que continuer à démonter le mailer par défaut Supabase.

**Aucune action d'écriture (Phases B/C/D) n'a donc pu être testée de bout en bout avec une vraie session** — seulement build + typecheck + repli "accès restreint" vérifiés. À valider dès que la connexion fonctionne.

## Ce que c'est, et ce que ce n'est PAS

- **Reconstruction, pas migration.** Ce projet est né d'une frustration de Jérôme sur les temps de réponse de l'app Apps Script existante (`carreau-mondorf-app` — Google Apps Script, `google.script.run`, rechargement complet par page). Objectif : un second projet, **complètement indépendant**, en Next.js, pour prouver qu'on peut avoir la même logique métier avec une vitesse et un rendu visuel très supérieurs.
- **Aucun lien de données avec `carreau-mondorf-app`.** Copie ponctuelle (export CSV → import Supabase, un seul aller), jamais de synchronisation. L'app Apps Script continue de vivre inchangée, sert de référence, **c'est elle qui est présentée au CA** (pas ce prototype) tant que ce dernier n'est pas validé.
- **Périmètre volontairement réduit à ce stade : module Compétition, en LECTURE SEULE, SANS AUTHENTIFICATION.** Pas de registre membres, pas d'actions CA (saisie de feuille de match, forfait), pas d'OTP — décisions actées explicitement avec Jérôme pour livrer vite un premier jalon jugeable sur vitesse + design. Voir section "Périmètre non couvert" plus bas.
- Claude (moi) pilote ce projet en chef de projet/analyste/designer ; Jérôme accompagne, valide les étapes clés, et effectue les actions que Claude ne peut pas faire (créer des comptes, `git push` — voir plus bas).

## Stack & infrastructure

- **Next.js 16** (App Router, Server Components, TypeScript), **Tailwind CSS v4**, déployé sur **Vercel**.
- **Supabase** (Postgres) comme base de données — lecture seule côté app (clé publique), écriture uniquement via le script d'import (clé secrète, jamais exposée côté client).
- **Dépôt GitHub** : `https://github.com/jeromedoyen/carreau-mondorf-nextjs` — dépôt séparé de `carreau-mondorf-app`, jamais mélanger les deux.
- **Déploiement** : push sur `main` → build automatique Vercel. URL de prod : `https://carreau-mondorf-nextjs.vercel.app`.
- Comptes créés par Jérôme lui-même (Claude ne crée jamais de comptes) : GitHub, Vercel (connecté via "Continue with GitHub"), Supabase (connecté via "Continue with GitHub").

### ✅ `git push` autonome activé depuis le 24/07/2026

Jusqu'ici bloquant (l'outil Bash de Claude n'a pas d'accès interactif à GitHub — pas de `/dev/tty`, pas de navigateur pour l'auth OAuth). Résolu après l'installation de **GitHub Desktop** par Jérôme : `git config --global credential.helper manager` + `credential.credentialStore wincredman` configurés globalement (partagé par tous les outils Git de la machine, y compris le shell de Claude), puis authentification faite une fois par Jérôme (login GitHub Desktop). Le jeton stocké dans le Gestionnaire d'identifiants Windows permet désormais à Claude de committer **et pousser** directement, sans intervention manuelle — testé et confirmé (`f456b4f`). Ne plus demander à Jérôme de faire `git push` sauf incident.

### ⚠️ Secrets déjà exposés en chat (gérés, mais schéma à ne pas reproduire)

Deux incidents cette session, tous deux corrigés :
1. Un jeton GitHub (PAT) collé par erreur dans le champ "Username" au lieu de "Password" → révoqué immédiatement par Jérôme après le push.
2. La clé secrète Supabase (`sb_secret_...`) collée directement dans le chat à deux reprises → utilisée puis régénérée par Jérôme.

**Pour la suite : ne jamais demander à coller un secret dans le chat.** Toujours faire éditer `.env.local` directement par Jérôme (fichier local, jamais commité — `.gitignore` exclut `.env*` sauf `.env*.example`), et confirmer par un simple "c'est fait" sans jamais transmettre la valeur.

## Modèle de données (Supabase)

Schéma dans `supabase/migrations/0001_init.sql`, appliqué manuellement via l'éditeur SQL Supabase (pas de CLI Supabase configurée). Cinq tables + une table `joueurs` légère :

- `rencontres_d2` — calendrier des rencontres Carreau Mondorf (National D2)
- `parties_d2` — détail des 20 parties d'une rencontre (non utilisé pour l'instant, aucune page ne l'exploite encore — prévu pour un futur onglet Statistiques)
- `division_d2_resultats` — poule complète (7 clubs), sert au classement recalculé
- `promotion_equipes` — équipes Promotion (trios, saison 2025 uniquement)
- `calendrier_federation` — tournois/Coupe de Luxembourg/etc. (non exploité pour l'instant, pas de page calendrier fédération unifié dans ce prototype)

Toutes les tables ont RLS activée avec une politique de lecture publique (`using (true)`), aucune politique d'écriture (l'import passe par la clé secrète qui contourne la RLS).

### Import des données (fait une fois, script réutilisable)

`scripts/import-csv.ts` (lancé via `npm run import -- --rencontres ... --division ... --promotion ... --federation ... [--dry-run]`). Lit des CSV exportés manuellement depuis les onglets Google Sheets de `carreau-mondorf-app` (Fichier → Télécharger → CSV). Points d'attention déjà rencontrés et corrigés :
- La colonne "Journée" est préfixée `J` dans Rencontres championnat et Équipes Promotion (ex. `J10`) mais purement numérique dans Résultats division D2 (ex. `10`) — `parseJournee()` dans `scripts/parse-date.ts` gère les deux formats.
- Alias de clubs normalisés via `scripts/club-aliases.ts` (port direct de `ALIAS_CLUBS_D2_` côté Apps Script).
- **Incident non élucidé** : en cours de session, les 6 tables ont brièvement disparu du cache de schéma PostgREST (`PGRST205`), puis carrément du Table Editor Supabase lui-même (donc pas qu'un cache — les tables avaient réellement disparu). Recréées en relançant le script SQL, import relancé avec succès ensuite. Cause jamais identifiée avec certitude (projet Supabase tout neuf ayant encaissé migration + régénération de clé coup sur coup). À surveiller si ça se reproduit — dans ce cas, vérifier d'abord Table Editor (pas seulement `NOTIFY pgrst, 'reload schema';`, qui n'avait pas suffi cette fois-là).

Données réellement importées (saison 2026 pour National D2, 2025 pour Promotion — seule saison disponible pour ce championnat clos) : 14 rencontres, 80 lignes de résultats de poule, 26 équipes Promotion, 26 événements fédération.

## Logique métier portée depuis l'Apps Script d'origine

`src/lib/data.ts` reproduit fidèlement (pas une réinvention) :
- `getClassementDivisionD2(saison)` — **même algorithme exact** que `getClassementDivisionD2()` dans `carreau-mondorf-app/DivisionD2Backend.gs` : cumul journée par journée, rang par (victoires desc, différence de points desc, points faits desc). Vérifié par comparaison manuelle : le classement recalculé en local reproduit exactement la trajectoire connue de Carreau Mondorf (3ᵉ → 4ᵉ → 3ᵉ → 1ᵉʳ à partir de J4, maintenu jusqu'à J8).
- `getRencontresD2`, `getEquipesPromotion` — lectures directes, pas de recalcul.

**Rapprochement de noms de joueurs volontairement PAS réimplémenté** : les données copiées ont déjà été nettoyées côté source (`rapprocherNomJoueur_()` dans l'app d'origine) — ce prototype n'écrit jamais de nouvelles données, donc pas besoin de refaire ce travail ici.

## Direction artistique — "Riviera / boulodrome"

Choix assumé et explicite de **ne pas reproduire la charte graphique de `carreau-mondorf-app`** (bleu/rouge/blanc, Oswald/Inter) — Jérôme a explicitement demandé l'effet "waouh", pas une copie de la v1. Univers propre à un club de pétanque méditerranéen plutôt qu'une app SaaS générique :

- **Palette** (`src/app/globals.css`) : sable/gravier chaud (`--sable`), vert pin (`--pin`), terracotta (`--terracotta`, couleur d'emphase pour Carreau Mondorf dans le graphique de classement — remplace l'ancien bleu), laiton (`--laiton`), marine (`--marine`, peu utilisé pour l'instant).
- **Typographies** (`src/app/layout.tsx`) : **Fraunces** (display, italique pour les titres), **Bebas Neue** (accroche façon "scoreboard", classe utilitaire `.font-score`), **Work Sans** (corps de texte). Volontairement pas Inter/Arial/Roboto (jugés génériques).
- **Composition** : cercles décoratifs asymétriques (évoquent des boules), animations d'entrée orchestrées (`@keyframes monter`, classe `.entree`, respecte `prefers-reduced-motion`), grain SVG subtil en overlay (`.grain`).
- Skills Claude installés et utilisés pour cette passe : `frontend-design` et `tailwind-v4-shadcn` (dans `~/.claude/skills/` — copiés depuis `github.com/secondsky/claude-skills`, catalogue complet cloné dans `~/claude-skills` si besoin d'en installer d'autres). Un plugin officiel Vercel (`vercel/vercel-plugin`, 30 skills + agents + commandes) est aussi installé via le mécanisme de plugins natif de Claude Code — actif à la prochaine session.
- shadcn/ui (la CLI, les composants Radix) **volontairement pas installé** — l'app n'a pas besoin de primitives accessibles complexes (pas de modales/dropdowns), un système de tokens Tailwind v4 fait main suffit et donne plus de contrôle créatif.

## Feuille de route "développement total" (décidée le 22/07/2026 avec Jérôme)

> 🗄️ **Archive — les cinq phases sont livrées depuis longtemps.** Conservé pour la trace de la décision, pas pour l'état du projet. Ce qui a changé depuis : l'authentification tourne en **OTP à 6 chiffres** (Brevo abandonné, voir session du 23/07), les statistiques individuelles ont été **reverrouillées au CA** le 23/07, et les phases 4 et 5 sont en production. Voir « Où en est le projet » en tête de fichier.

Jérôme a demandé de poursuivre le développement complet du prototype (pas juste le module Compétition en lecture seule). Séquencée en 5 phases :

1. **Statistiques individuelles** (National D2 + Promotion) — **FAIT**, voir session du 22/07.
2. **Calendrier fédération unifié** — **FAIT**, voir session du 22/07.
3. **Authentification** — **code fait**, config Dashboard Supabase restante (voir session ci-dessous). Décidé avec Jérôme : Supabase Auth natif (OTP email) + SMTP Brevo (pas de portage maison de l'OTP), plus une table `acces` minimale (email+nom, pas le registre complet) important de l'onglet "Accès" pour restreindre qui peut se connecter.
4. **Registre membres/licenciés** — RGPD-sensible, nécessite la phase 3 d'abord.
5. **Actions CA en écriture** (saisie feuille de match, forfait, édition rencontre) — nécessite auth + rôle CA + policies Supabase en écriture (RLS actuellement lecture seule pour tout le monde, écriture uniquement via la clé de service du script d'import).

**Décision actée** : les statistiques individuelles sont **publiques pour l'instant** (cohérent avec le périmètre 100% public actuel du prototype), alors qu'elles sont réservées au CA dans l'app d'origine (`requireMembreCA_`) — à reverrouiller une fois la phase 3 (auth) faite.

## Périmètre non couvert (pistes pour la suite, pas encore commencées)

> 🗄️ **Archive — plus rien de cette liste n'est vrai au 21/09/2026.** Les trois points sont livrés et en production. En particulier, la phrase « ce prototype est 100% public/sans connexion » est **fausse** depuis le 23/07/2026 : l'application est authentifiée et l'essentiel des écrans est réservé aux licenciés ou au CA. Conservé pour la trace ; voir « Où en est le projet » en tête de fichier.

- **Actions CA** : saisie de feuille de match, déclaration de forfait, édition d'une rencontre — tout ça reste dans l'app Apps Script pour l'instant (phase 5 ci-dessus).
- **Authentification** : ce prototype est 100% public/sans connexion (phase 3 ci-dessus).
- **Registre membres/licenciés** : pas commencé, RGPD-sensible, phase ultérieure (phase 4 ci-dessus).

## Session du 22/07/2026 (suite) — résolution du déploiement Vercel périmé

- **Cause racine trouvée** : les deux derniers déploiements (`9ea9065`, `a6266b4`) étaient en **Error** sur Vercel — donc la prod restait épinglée sur l'ancien build réussi (avant la refonte "Riviera"), d'où l'ancienne charte bleu/rouge/Oswald/Inter encore visible malgré des push réussis sur `main`. Ce n'était pas un problème de cache CDN (confirmé : `x-vercel-cache: HIT` avec un `age` qui grimpait sans jamais se rafraîchir, cohérent avec "toujours le même vieux build").
- **Diagnostic** : `npm run build` en local passait sans erreur (Windows, insensible à la casse) — écarté un premier temps l'hypothèse casse de fichier (vérifié explicitement, aucun mismatch). Le log Vercel donnait `Error: Failed to collect page data for /national-d2`, qui pointait vers `getClassementDivisionD2()`/`getRencontresD2()` (`src/lib/data.ts`) appelant Supabase **au moment du build** (génération statique). Cause confirmée : `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` **absentes des Environment Variables Vercel (Production)** — présentes seulement en local dans `.env.local` (gitignored, jamais synchronisé côté Vercel).
- **Corrigé par Jérôme** : les deux variables ajoutées dans Vercel → Settings → Environment Variables (Production), puis redeploy manuel du dernier commit. Build réussi, vérifié via fetch direct (`x-vercel-cache: PRERENDER`, `age: 0`, classes de police `fraunces_.../bebas_neue_.../work_sans_...` présentes dans le HTML servi) et lecture du contenu de la page d'accueil (texte "1er de la poule National D2 à l'issue de la journée 8" bien affiché).
- **Leçon retenue** : toute variable d'environnement ajoutée dans `.env.local` pour une donnée consommée **au build** (pas seulement au runtime) doit être répliquée dans Vercel dès sa création, pas seulement au moment où l'app plante — `/national-d2` et `/promotion` font un fetch Supabase pendant la génération statique, donc un env var manquant y casse le build entier, pas juste une page en erreur runtime.
- Validation visuelle humaine sur un vrai écran (au-delà de la vérification technique ci-dessus) toujours à faire par Jérôme — outil de capture d'écran resté capricieux en fin de session, contenu confirmé par inspection réseau/DOM uniquement.

## Session du 22/07/2026 (suite) — Phase 1 : statistiques individuelles

- **`scripts/import-csv.ts`** étendu avec `--parties <csv>` : importe le détail de "Parties championnat" dans `parties_d2`, en résolvant `Id_Rencontre` (Id d'origine côté Sheet) vers `rencontres_d2.id` (Supabase) via `source_id` — nécessite que `--rencontres` ait déjà été importé avant (dans cette exécution ou une précédente). Jérôme a exporté et fourni le CSV (160 lignes = 8 rencontres × 20 parties), import réel exécuté avec succès, toutes les lignes résolues sans `Id_Rencontre` introuvable.
- **`src/lib/stats.ts`** (nouveau) :
  - `getStatistiquesJoueursD2(saison)` — **port fidèle** de `calculerStatistiquesJoueurs_()` (`carreau-mondorf-app/ChampionnatBackend.gs:1244`) : même regroupement par nom normalisé (`sansAccents()`, équivalent JS de `sansAccents_()`), mêmes clés de binôme/trio (type + noms triés), même tri (tauxVictoire desc, puis joues desc). Lit `parties_d2` + `rencontres_d2` via Supabase (au lieu des Sheets).
  - `getStatistiquesPromotion(saison)` — **pas un port** (l'app d'origine n'affichait jamais ce calcul), calcul propre à ce prototype à partir de `promotion_equipes` (déjà en base, aucun nouvel import nécessaire) : participations et parties gagnées par joueur/trio, sans détail de partie individuelle (non transcrit à l'import d'origine). Résultat : quelques doublons de noms visibles côté Promotion (ex. "SALVAN Thierry"/"SALVAN Thiery", "Szczucki Bernard"/"SZCUCKI Bernard", "PRYBYLA Jeannine"/"PRYBYLA Jeanine") — **attendu, pas un bug** : contrairement au National D2, la Promotion n'a jamais eu de rapprochement de noms appliqué côté source.
- **UI** : `src/components/StatistiquesD2.tsx` (classement triable taux de victoire/parties jouées, drill-down par joueur au clic — détail par type de partie + 6 dernières parties —, tableau binômes/trios) et `src/components/StatistiquesPromotion.tsx` (classement triable, bilan par trio, pas de drill-down puisqu'aucun détail de partie disponible). Remplacent les placeholders "à venir" dans `src/app/national-d2/page.tsx` et `src/app/promotion/page.tsx`. Réutilisent les tokens visuels "Riviera" existants (`bg-sable-carte`, `border-ligne`, `font-display`/`font-score`, `text-terracotta`), aucune nouvelle dépendance.
- **Vérifié en local** (`npm run dev`, navigateur) : les deux onglets Statistiques affichent des données réelles et cohérentes, tri et drill-down fonctionnels. `npx tsc --noEmit`, `npm run lint` et `npm run build` passent sans erreur.
- **`.claude/launch.json`** créé pour ce projet (manquait) — `npm run dev`, port 3000, `autoPort: true`.
- Commité (`57bd4ea`) et poussé par Jérôme, déployé sur Vercel et **vérifié en production** (National D2 et Promotion affichent les mêmes données que testées en local).

## Session du 22/07/2026 (suite) — Phase 2 : calendrier fédération unifié

- **`src/lib/data.ts`** : nouvelle fonction `getCalendrierFederation(saison)` (lecture directe de `calendrier_federation`) + `fusionnerCalendrier(rencontres, federation)`, **port simplifié** de `getCalendrierUnifie()` (`carreau-mondorf-app/CalendrierFederation.gs:133`) : mêmes deux sources (rencontres D2 + calendrier fédération), triées chronologiquement — la 3ᵉ source de l'original (manifestations internes du club) est hors périmètre de ce prototype (pas de module Événements ici), donc volontairement absente.
- **Nouvelle page `/calendrier`** (`src/app/calendrier/page.tsx`) + composant `src/components/CalendrierUnifie.tsx` (client) : liste chronologique groupée par mois, filtre multi-catégorie (chips togglables), catégories issues des données réelles (National D2, Promotion, Tournoi, Championnat national, Coupe de Luxembourg) coloriées avec les tokens "Riviera" existants (`--terracotta`/`--pin`/`--laiton`/`--marine`/`--marine-clair` — pas de nouvelle couleur inventée). Principe repris de `ClassementBars.tsx` : l'info (lieu, domicile/extérieur) reste toujours visible en ligne, jamais seulement au survol.
- Lien "Calendrier" ajouté à `NavBar.tsx`.
- **Vérifié en local** : les 26 événements fédération + les rencontres D2 (hors journées "Exempt") apparaissent bien fusionnés et triés (avril → octobre 2026), le filtre par catégorie masque/affiche correctement (testé en désactivant "Tournoi"). `npx tsc --noEmit`, `npm run lint` et `npm run build` passent sans erreur.
- **Pas encore fait** : commit + push (Jérôme) ; déploiement Vercel ; validation visuelle humaine sur un vrai écran.

## Session du 22/07/2026 (suite) — Phase 3 : authentification (code fait, config Dashboard restante)

Décidé avec Jérôme avant de coder (deux questions posées) : **Supabase Auth natif + OTP email** (pas de portage maison du flux Brevo de `Code.gs`) et une **table `acces` minimale** (email + nom, pas le registre complet — ça reste la Phase 4) pour restreindre qui peut se connecter, à l'image de l'onglet "Accès" de l'app d'origine.

- **`supabase/migrations/0002_acces.sql`** : table `acces` (email, nom), RLS activée sans politique de lecture publique (contrairement aux autres tables — celle-ci n'est consultée que côté serveur). Contient aussi `verifier_acces_avant_creation(event jsonb)`, une fonction Postgres au contrat exact du hook Supabase **"Before user created"** (vérifié via la doc Supabase avant d'écrire le SQL, pas deviné) : rejette la création d'un compte auth (donc l'envoi du code OTP) pour tout email absent de `acces`, avec un message d'erreur explicite côté serveur — équivalent de `isAuthorized_(email)` dans `Code.gs`.
- **`scripts/import-csv.ts`** étendu avec `--acces <csv>` (colonnes Email, Nom — export de l'onglet "Accès", pas le registre complet).
- **Couche Supabase SSR** (`@supabase/ssr`, nouvelle dépendance) : `src/lib/supabase/client.ts` (navigateur), `src/lib/supabase/server.ts` (Server Components/Actions, cookies via `next/headers`), `src/proxy.ts` (le nouveau nom de `middleware.ts` en Next.js 16 — renommage fait via le codemod officiel `@next/codemod middleware-to-proxy`, sinon avertissement de dépréciation au build) qui rafraîchit le cookie de session à chaque requête.
- **`/connexion`** (`src/app/connexion/page.tsx` + `src/components/ConnexionForm.tsx`) : formulaire en 2 étapes (email → code à 6 chiffres), sur `supabase.auth.signInWithOtp()` / `verifyOtp()`. **Message neutre volontaire** après l'envoi du code, que l'adresse soit autorisée ou non ("Si cette adresse est autorisée, un code vient de lui être envoyé...") — même choix explicite que `requestCode()` dans `Code.gs` ("on ne confirme pas si l'adresse est connue ou non"), alors que le vrai rejet se fait bien côté serveur via le hook.
- **Piège de perf repéré et corrigé avant qu'il parte en prod** : une première version de `NavBar.tsx` lisait la session **côté serveur** (`await supabase.auth.getUser()` dans un Server Component) pour afficher Connexion/Déconnexion — ça a fait basculer **toutes les pages** de statique (`○`) à dynamique (`ƒ`) au build, parce que `cookies()` dans l'arbre du layout racine force le rendu dynamique de tout ce qui en dépend. Contraire à l'objectif même de ce prototype (vitesse). Corrigé en isolant l'état de connexion dans un petit composant client à part (`src/components/AuthNavLink.tsx`, hydraté après coup via `onAuthStateChange`) — `NavBar.tsx` redevient un Server Component statique. Reconfirmé par `npm run build` : toutes les routes repassées en `○ (Static)`.
- **Vérifié en local** : `/connexion` s'affiche correctement, le lien "Connexion" apparaît dans la nav (état déconnecté par défaut, pas de flash visible). `npx tsc --noEmit`, `npm run lint`, `npm run build` passent sans erreur. **Pas testé de bout en bout** (envoi réel d'un code) — volontairement, pour ne pas déclencher d'appel réel à l'Auth Supabase avant que la config Dashboard ci-dessous soit faite (le hook n'étant pas câblé, un email non filtré recevrait quand même un code).

### État des 6 étapes manuelles (session du 22/07/2026 au soir)

1. ✅ **Migration `0002_acces.sql` appliquée.**
2. ✅ **Table `acces` importée** (5 lignes depuis l'export "Accès", `npm run import -- --acces ...`).
3. ⚠️ **Provider Email OTP** : pas trouvé/confirmé explicitement dans le Dashboard par Jérôme — probablement actif par défaut (aucun souci observé de ce côté), à revisiter seulement si un autre indice pointe dessus.
4. ❌ **SMTP custom Brevo : bloquant, non résolu.** Voir le long débogage ci-dessous.
5. ✅ **Auth Hook câblé** — confirmé fonctionnel : un test avec un email absent de `acces` serait rejeté avant création (non re-testé explicitement ce soir mais le hook est bien sélectionné dans le Dashboard).
6. ⚠️ **Test de bout en bout : partiellement fait.** L'envoi d'un code fonctionne avec le mailer par défaut Supabase (email bien reçu), mais échoue silencieusement avec Brevo — et même le mailer par défaut ne peut pas être adapté pour envoyer un code (voir ci-dessous). Le flux `/connexion` → code → session n'a **jamais été validé jusqu'au bout** (aucun code à 6 chiffres reçu à ce stade).

### 🔴 Blocage en cours : l'envoi d'email OTP ne fonctionne pas de bout en bout

Long débogage ce soir (nombreux allers-retours Dashboard Supabase ↔ Brevo), non résolu, deux problèmes distincts identifiés et imbriqués :

**Problème A — Brevo SMTP n'envoie rien, malgré une config qui semble entièrement correcte.**
- Progression du débogage, dans l'ordre : IP non autorisée (`525 5.7.1 Unauthorized IP address`, corrigé côté Brevo) → mauvais Username SMTP (corrigé : `b25310001@smtp-brevo.com`, pas l'email de l'expéditeur) → à ce stade, Supabase répond `200 {}` avec un log Auth propre (`user confirmation requested: request completed`), mais **strictement aucune trace côté Brevo** (ni Logs Transactionnel, ni Statistiques), et aucun email reçu, y compris après une attente de 2-3 min (élimine un simple délai de livraison Yahoo).
- Vérifié et éliminé comme causes : sender `jeromedoyen04@gmail.com` bien **vérifié** dans Brevo ; host/port/username/password conformes aux identifiants SMTP Brevo ; rate limits Supabase largement suffisants ; "Minimum interval per user" (60s) pas en cause (testé avec des attentes largement supérieures).
- **Piste non vérifiée, à essayer en premier à la reprise** : Brevo → **Contacts** → chercher `jerome_doyen@yahoo.fr` → vérifier un statut **Bloqué/Rebond/Désabonné** (nos tout premiers essais ratés, du temps de l'erreur IP, ont pu faire passer ce contact sur liste de suppression côté Brevo — auquel cas Brevo accepte la connexion SMTP mais droppe silencieusement l'envoi sans le logger comme "envoyé"). Vérifier aussi le filtre **"Bloqué"** dans Transactionnel → Logs (pas seulement la vue par défaut).
- Si ça ne débloque rien : contacter le support Brevo directement avec le détail ci-dessus (compte peut-être en validation/limité).

**Problème B — même en contournant A avec le mailer par défaut Supabase, notre UI ne peut pas fonctionner.**
- Test isolé concluant : SMTP custom désactivé → email bien reçu instantanément. Ça confirme que le problème est spécifiquement dans le relais Brevo (Problème A), pas dans notre code/l'app/le hook.
- **Mais** : l'email reçu via le mailer par défaut est un lien de confirmation classique (template "Confirm signup" standard), **pas un code à 6 chiffres** — notre `/connexion` attend un code (`verifyOtp` avec un `token`), pas un clic sur un lien. Pour qu'un code apparaisse, il faut personnaliser le template email (ajouter `{{ .Token }}`) — **et Supabase interdit la personnalisation des templates tant que le SMTP par défaut est actif** (limite anti-abus de leur infra partagée). Donc : mailer par défaut = pas de code possible ; Brevo = template personnalisable mais rien n'arrive (Problème A).
- **Deux issues possibles une fois A résolu** : (a) Brevo refonctionne → template personnalisable → ajouter `{{ .Token }}` au template "Confirm signup" (et "Magic Link") → notre UI actuelle fonctionne telle quelle. (b) Si Brevo reste bloqué durablement, envisager d'adapter `ConnexionForm.tsx`/`/connexion` pour accepter le lien de confirmation par défaut (nécessite une route de callback `/auth/confirm` et un changement de flux UI, pas juste un correctif de config) — solution de repli plus lourde, à ne considérer qu'en dernier recours.

## Session du 23/07/2026 — feu vert du CA, abandon de Brevo, lien magique, scaffold registre membres

**Contexte** : Jérôme a présenté les deux projets (v1 en prod + ce prototype) au CA — accueil positif, feu vert pour continuer. Décisions actées dans la foulée : **dépôt GitHub reste local** (pas de remote, "personne ne saura s'en sortir avec cette architecture") ; **le prototype Next.js devient la priorité de développement** (limites de temps de réponse d'Apps Script à l'usage réel) ; **abandon de toute solution SMTP via Gmail/Yahoo personnel** (le débogage Brevo de la veille n'a jamais abouti — voir sections précédentes) ; **nouvelle exigence produit** : toute future action d'écriture doit tracer qui a fait quoi (documenté dans `CLAUDE.md`, à appliquer dès la première action d'écriture réelle, Phase 5).

- **Auth basculée sur lien magique** (abandon définitif du code à 6 chiffres) : `ConnexionForm.tsx` simplifié à une seule étape (email → "vérifiez votre boîte mail"), nouvelle route `src/app/auth/callback/route.ts` (`exchangeCodeForSession`, flux PKCE standard `@supabase/ssr`). Utilise le **mailer par défaut Supabase** (pas de SMTP custom, donc plus de dépendance à Brevo/Gmail/Yahoo) — déjà prouvé fonctionnel la veille. Testé une fois en local (200 côté Supabase) avant de heurter le rate-limit horaire du mailer par défaut (attendu, accepté par Jérôme : "c'est ok").
- **Rôle CA ajouté** : `acces.est_ca` (migration `0003_role_ca.sql`) + deux fonctions RLS (`est_membre_ca()`, `est_licencie()`) réutilisables par toute future table à protéger. Les 5 comptes déjà importés sont tous CA (marqués `est_ca = true`).
- **Scaffold du registre membres** (`0004_registre_membres.sql`, `/membres`, `src/lib/membres.ts`, `RegistreMembres.tsx`) : tables `personnes`/`adhesions` (port fidèle de `PERSONNES_HEADERS`/`ADHESIONS_HEADERS`, y compris le piège "Code postal / Ville" = **une seule colonne** côté source, pas deux — vérifié dans `Code.gs` avant d'écrire le schéma), lecture réservée au CA via `est_membre_ca()`. **Structure et droits d'accès seulement — aucune donnée personnelle réelle importée**, décision volontairement séparée (RGPD, sujet différent des résultats sportifs déjà traités). Testé en local sans session/sans migration appliquée : accès correctement refusé ("Réservé au comité"), comportement fail-safe confirmé.
- `scripts/import-csv.ts` étendu avec `--personnes`/`--adhesions` (prêt, pas encore utilisé) et `--acces` (déjà utilisé, cf. session précédente).
- Commité (`153543c`) — **pas encore poussé**.

### ⚠️ Reste à faire par Jérôme avant que tout ça soit utilisable en conditions réelles

1. **`git push`** (le commit `153543c` couvre calendrier + auth + scaffold registre membres).
2. **Appliquer les migrations `0003_role_ca.sql` et `0004_registre_membres.sql`** via l'éditeur SQL Supabase (même geste que `0001`/`0002`).
3. **Ajouter `http://localhost:3000/auth/callback` aux Redirect URLs** (Dashboard Supabase → Authentication → URL Configuration) — sinon le lien de connexion ne pourra pas rediriger correctement. Ajouter aussi l'URL de prod (`https://carreau-mondorf-nextjs.vercel.app/auth/callback`) une fois redéployé.
4. **Retester `/connexion` de bout en bout** une fois le rate-limit horaire du mailer par défaut Supabase passé (déclenché par les essais de la veille) — cliquer le lien reçu, vérifier l'arrivée sur `/` connecté (lien "Déconnexion" visible).
5. ~~Donner les emails manquants pour compléter le CA~~ — **confirmé par Jérôme : Marie-Jean Flammang, Marco Bertemes, Osvaldo Brunetta n'ont pas d'email dans l'app v1 non plus** (même gap des deux côtés, pas un oubli de ce prototype). Rien à corriger ici.

## Session du 23/07/2026 (suite) — logo du club + modèle d'accès à 3 niveaux

- **Logo du club** : extrait `LOGO_BASE64` (`carreau-mondorf-app/Logo.js`, PNG 500×261) vers un vrai fichier `public/logo.png` — **volontairement pas en base64 inline** (c'est exactement le point de perf jamais corrigé de v1 : "166 Ko en base64 réinjecté à chaque page, aucun cache navigateur possible"). Affiché dans `NavBar.tsx` via `next/image` (`priority`, redimensionnement/cache automatique par l'optimiseur Next.js) — présent sur toutes les pages puisque `NavBar` est dans le layout racine. Vérifié en local : chargé et servi via `/_next/image` avec plusieurs tailles générées.
- **Modèle d'accès précisé par Jérôme** : distinction explicite entre `est_membre_ca` (CA officiel), un futur `est_licencie` (statut sportif réel, table `adhesions`) et un futur `est_membre` (n'importe quel type d'adhésion, licencié ou non) — **pas juste "CA vs tout le monde"**. Par-dessus, **Jérôme est un cas à part : "Administrateur", super-pouvoirs d'accès CA sans être officiellement membre du CA** — même principe que l'entrée `masque:true` de `MEMBRES_CA` côté v1.
  - `0003_role_ca.sql` réécrite (n'avait pas encore été appliquée, donc modifiable sans migration corrective) : ajoute `acces.est_admin` et `acces.masque`. Jérôme (`jerome_doyen@yahoo.fr`) marqué `est_admin=true, masque=true, est_ca=false` ; les 4 autres marqués `est_ca=true`. `est_membre_ca()` vérifie désormais `est_ca OR est_admin`.
  - L'ancienne fonction `est_licencie()` (qui ne faisait en réalité que vérifier une ligne dans `acces`, donc "a le droit de se connecter", pas un vrai statut licencié) a été **renommée `est_utilisateur_autorise()`** pour ne pas semer la confusion avec le futur vrai `est_licencie()` basé sur les données du registre (`adhesions.type = 'Licencié'`) — pas encore créé, nécessite les données réelles + un lien fiable `acces.email` ↔ `personnes.email`. Forme attendue documentée en commentaire à la fin de `0004_registre_membres.sql`.
- Ces deux changements (logo + migration réécrite) sont dans le prochain commit, pas encore poussés séparément de la session précédente.

### Pas encore fait après ça (fast-follow une fois l'auth prouvée fonctionnelle)

- **Reverrouiller les statistiques individuelles au CA** (décision actée en Phase 1 : public "pour l'instant") — techniquement possible via `est_membre_ca()`/`est_utilisateur_autorise()`, pas encore fait, à traiter une fois l'auth validée en conditions réelles.
- **Créer les vraies fonctions `est_licencie()`/`est_membre()`** une fois le registre membres réellement importé (voir commentaire en fin de `0004_registre_membres.sql`).
- **Import réel des données du registre membres** — en attente de confirmation explicite de Jérôme + des exports CSV (Personnes/Adhésions).
- Déploiement Vercel de cette session ; validation visuelle humaine.
- Piste Brevo/DMARC (sections précédentes) : abandonnée pour le login, plus d'actualité sauf besoin futur d'envoi d'email transactionnel dans ce prototype.

## Session du 23/07/2026 (suite) — Phase 5 : première action CA en écriture (saisie feuille de match D2)

Premier vrai test grandeur nature du modèle d'accès et de l'exigence d'audit-log décidés plus tôt dans la session.

- **`0005_ecriture_ca.sql`** (appliquée par Jérôme) :
  - `parties_d2.supprime` (suppression douce) — n'existait pas encore, l'import initial (Phase 1) ne portait que des données déjà nettoyées.
  - Policies d'écriture (`insert`/`update`) sur `rencontres_d2` et `parties_d2`, réservées au CA via `est_membre_ca()`. Pas de policy `delete` — suppression douce uniquement, jamais de hard-delete (cohérent avec l'app d'origine).
  - **`journal_modifications`** (table générique, réutilisable pour toute future table mutable) + trigger `journaliser_modification()` posé sur `rencontres_d2`/`parties_d2` — capture automatiquement qui (email de session) a fait quoi (création/modification, avant/après en JSON), sans dépendre du code applicatif pour y penser à chaque fois. Répond directement à l'exigence d'audit de Jérôme.
- **`src/lib/actions/matchSheet.ts`** — Server Action `enregistrerResultatRencontre()`, port fidèle de `enregistrerResultatRencontre_()` (`ChampionnatBackend.gs:616`) : suppression douce des parties existantes, recalcul du score via `pointsVictoirePartie()` (même barème par phase/type), mise à jour du statut/résultat de la rencontre. **Simplification assumée** : pas de rapprochement automatique des noms de joueurs (`rapprocherNomJoueur_`/`canoniserJoueursCM_`, système de correspondance flou non porté) — les noms sont enregistrés tels que saisis par le CA. Double contrôle d'accès : vérification explicite `est_membre_ca()` en début de fonction (message clair) + RLS en filet de sécurité.
- **UI** : `FeuilleDeMatch.tsx` (formulaire des 20 parties réparties sur 4 phases, préremplissage si une saisie existe déjà) sur une nouvelle route `/national-d2/rencontres/[id]`, gardée CA côté serveur (même pattern que `/membres`). Lien "Saisir"/"Modifier" ajouté dans `CalendrierD2.tsx` — **converti en Client Component** pour vérifier le statut CA côté client (`onAuthStateChange`-style, via RPC `est_membre_ca` au montage) plutôt que côté serveur, afin que `/national-d2` reste statique (même piège déjà rencontré avec `NavBar.tsx` et évité ici dès la conception).
- **`getRencontresD2`/`RencontreD2`** complétés avec `id` (manquant jusqu'ici, nécessaire pour lier vers la page de saisie). Nouvelle fonction `getRencontreDetail(id)` dans `data.ts` (lecture publique, rencontre + parties existantes pour préremplissage).
- **Vérifié en local** : build propre, toutes les pages de données toujours statiques (`○`), seules `/national-d2/rencontres/[id]`, `/connexion`, `/membres`, `/auth/callback` dynamiques (attendu). Gate CA testé sans session : accès refusé correctement sur `/national-d2/rencontres/1` ("Réservé au comité"), aucun lien "Saisir/Modifier" visible sur `/national-d2`. **Pas testé de bout en bout avec une vraie session CA** (nécessite de compléter le flux de connexion par lien magique, pas automatisable depuis cette session) — à faire par Jérôme à la reprise : se connecter, saisir un résultat pour une rencontre "à venir", vérifier le score/statut recalculés et une ligne dans `journal_modifications`.
- Commité (`0c9e43b`) et poussé par Jérôme.

## Session du 23/07/2026 (suite) — déclaration de forfait

- **`src/lib/actions/matchSheet.ts`** — `declarerForfaitRencontre()`, port fidèle de `declarerForfaitRencontre_()` (`ChampionnatBackend.gs:1193`) : le club vainqueur d'un forfait remporte 32-0. Les statuts `ForfaitCM`/`ForfaitAdverse` étaient déjà prévus dans le `check` constraint de `rencontres_d2` depuis `0001_init.sql` — aucune migration nécessaire. Ne touche jamais `parties_d2` (même gap connu que l'original : si une feuille de match avait déjà été saisie puis corrigée en forfait, les anciennes parties restent en base — pas corrigé, fidélité au comportement source).
- **UI** : `ForfaitPanel.tsx` (confirmation en deux temps — clic sur "Forfait X" puis confirmation inline avec le score annoncé, jamais de `window.confirm()`) ajouté en haut de la page de saisie, au-dessus de `FeuilleDeMatch`. `CalendrierD2.tsx` corrigé : les rencontres en forfait étaient jusqu'ici affichées comme "à venir" (le check `statut === 'Jouée'` ne couvrait pas `ForfaitCM`/`ForfaitAdverse`) — ajout d'un badge "Forfait" à côté du score.
- **Vérifié en local** : build propre, aucune régression sur `/national-d2` (pas de rencontre en forfait dans les données actuelles, donc rendu identique). Gate CA revérifié.
- Commité (`452bca8`) — **pas encore poussé**.

### Pas encore fait

- `git push` de cette dernière session.
- Test d'écriture réel de bout en bout (saisie feuille de match ET forfait) — nécessite une vraie session CA connectée.
- Import réel du registre membres (en attente des exports CSV + confirmation de Jérôme).
- Équivalent Promotion des actions CA en écriture (pas commencé — la Promotion n'a pour l'instant que de la lecture).

## Session du 23/07/2026 (suite) — reverrouillage des statistiques individuelles D2 au CA

- **`0006_verrouillage_stats.sql`** : `parties_d2` passe de lecture publique à lecture CA uniquement (`est_membre_ca()`). Vraie restriction RLS (pas un masquage d'interface qui laisserait la donnée accessible en appelant l'API Supabase directement).
- **Refactor pour préserver le rendu statique** : `getStatistiquesJoueursD2`/`getStatistiquesPromotion` (`src/lib/stats.ts`) prennent désormais le client Supabase en paramètre plutôt que d'en importer un fixe. `StatistiquesD2.tsx` est devenu un composant qui récupère et calcule ses propres données **côté client** (vérifie `est_membre_ca()` via RPC au montage, puis charge les stats avec le client navigateur porteur de la session) — évite de refaire l'erreur déjà commise deux fois (`NavBar.tsx`, puis `CalendrierD2.tsx`) de forcer `/national-d2` en rendu dynamique en calculant les stats côté serveur dans une page qui doit rester statique. `getRencontreDetail` (préremplissage de la feuille de match) bascule sur le client avec session pour la même raison RLS.
- **Décision en attente, pas tranchée unilatéralement** : les statistiques **Promotion restent publiques** — `promotion_equipes` sert aussi `CalendrierPromotion.tsx` (composition des équipes, déjà public), donc la verrouiller casserait une fonctionnalité existante. Deux options pour Jérôme : (a) accepter l'asymétrie D2 verrouillé / Promotion public, ou (b) rendre tout le module Promotion réservé aux licenciés connectés comme dans l'app d'origine (changement plus large, touche aussi le calendrier).
- **Vérifié en local** : build propre, `/national-d2` toujours statique (`○`). Onglet Statistiques testé sans session : message "réservé au comité d'administration" + lien de connexion, confirmé.
## Session du 23/07/2026 (suite) — Promotion réservée aux licenciés (décision "b")

Jérôme a tranché : (b), tout le module Promotion aligné sur "tout licencié" comme l'app d'origine, plutôt que l'asymétrie de la session précédente.

- **`0007_verrouillage_promotion.sql`** : `promotion_equipes` passe en lecture réservée via `est_utilisateur_autorise()` (pas `est_membre_ca()` — n'importe quel compte `acces` suffit, CA ou non).
- **`src/app/promotion/page.tsx`** vidée de toute logique — juste l'en-tête statique + `<PromotionContent saison="..." />`. Tout le contenu (calendrier ET statistiques, les deux, contrairement au D2 où seul l'onglet Stats est concerné) chargé côté client par le nouveau `PromotionContent.tsx` après vérification de session (même principe que `StatistiquesD2.tsx`) — `/promotion` reste statique.
- **Refactor imprévu mais nécessaire** : `getRencontreDetail` (la seule fonction de `data.ts` à utiliser le client avec session) a dû être déplacée dans son propre fichier `src/lib/rencontreDetail.ts`. Tant qu'elle vivait dans `data.ts`, le build cassait dès que `PromotionContent.tsx` (Client Component) importait `data.ts` pour `getEquipesPromotion` (fonction publique) — `next/headers` (utilisé par le client avec session) ne peut pas atterrir dans un bundle client, même si la fonction fautive n'est jamais appelée côté client. **Leçon retenue pour la suite** : toute fonction utilisant le client Supabase avec session doit vivre dans un fichier séparé des fonctions à lecture publique, jamais mélangées dans le même module.
- **Vérifié en local** : build propre, `/promotion` toujours statique. Testé sans session : "Le module Promotion est réservé aux licenciés du club" + lien de connexion, sur le calendrier ET les stats (un seul gate pour tout l'onglet). `/national-d2` re-testé, aucune régression.
- Commité (`a029299`) — **pas encore poussé**. Migration `0007` restante à appliquer par Jérôme.

## Session du 23/07/2026 (suite) — passe qualité/audit autonome (mandat large de Jérôme)

Jérôme a donné carte blanche ("tu es l'expert", tests/qualité/visuel/fonctionnalités à améliorer selon mon jugement). Session d'audit plutôt que de nouvelle fonctionnalité.

- **Vérifications de sécurité (via clé de service, lecture seule)** :
  - `parties_d2` confirmé verrouillé pour un client anonyme (migration `0006` bien appliquée). `promotion_equipes` confirmé **encore public** (migration `0007` pas encore appliquée par Jérôme à ce stade — attendu, pas un bug).
  - Écriture testée avec la clé anonyme : `insert` sur `parties_d2` rejeté explicitement par la RLS ; `update` sur `rencontres_d2` accepté sans erreur par PostgREST mais **0 ligne réellement modifiée** (comportement standard de Postgres RLS pour `UPDATE` — silencieux, pas une erreur — revérifié via la clé de service que la donnée n'avait pas bougé). Sécurité d'écriture confirmée solide des deux côtés.
- **Bug réel trouvé et corrigé — navigation mobile cassée** : jamais testé sur petit écran jusqu'ici. `NavBar.tsx` n'avait aucun point de rupture responsive, tous les liens sur une seule ligne flex sans wrap — le texte se chevauchait littéralement sous ~640px. Corrigé avec un menu hamburger (`MobileMenu.tsx`, nouveau composant client isolé — `NavBar.tsx` reste statique), fermeture au clic extérieur/Échap ajoutée dans la foulée.
- **Feuille de match rendue responsive** : le tableau de saisie à 5 colonnes serrées devenait illisible sur petit écran — enveloppé dans `overflow-x-auto` (même pattern que `RegistreMembres.tsx`), `min={0}` ajouté sur les champs de score.
- **Balayage de la console navigateur** sur toutes les pages (national-d2, promotion, calendrier, membres, connexion, saisie de rencontre) — propre, aucune erreur réelle (des erreurs obsolètes étaient d'abord apparues à cause d'un cache Turbopack périmé sur un serveur de dev qui tournait depuis longtemps ; redémarrage propre + nouvel onglet navigateur pour confirmer que c'était bien du bruit, pas un vrai bug).
- **Point resté ouvert, maintenant fermé** : "équivalent Promotion des actions CA en écriture" retiré de la liste des pistes — vérifié dans `PromotionBackend.gs` (app d'origine) qu'**aucune fonction d'écriture n'existe pour la Promotion**, cohérent avec la saison 2025 explicitement documentée comme historique/close (plus aucune nouvelle donnée n'y sera jamais entrée). Ce n'est pas un manque de ce prototype, juste un module qui n'a jamais eu besoin d'écriture.
- Commits de cette passe : `c2a6862` (nav mobile), `5cfdb98` (feuille de match responsive), `2a9bc58` (fermeture menu mobile) — **pas encore poussés**.

- **Migrations `0006`/`0007` confirmées appliquées par Jérôme** — reverrouillage stats D2 + Promotion désormais réellement actif en base (revérifié via clé anonyme : les deux tables refusent la lecture publique).
- **Favicon, titres de page, accessibilité** : `icon.png` (recadré depuis le logo, les deux boules) remplace le favicon par défaut de Next.js — jamais changé depuis le scaffold initial. Titre d'onglet dynamique par page (`title.template` dans `layout.tsx`). `aria-label` ajoutés sur les champs de `FeuilleDeMatch.tsx` (seuls des `placeholder` existaient).
- Dark mode explicitement écarté par Jérôme ("point de détail") — ne pas y revenir sans demande explicite.
- Commits de cette dernière passe : `fd67365`.

## Session du 26/07/2026 — pense-bête #14-20, module Bénévole, paiements, tests sur compte fictif

Grosse session à base de retours ponctuels de Jérôme (pense-bête `C:\Temp\pense-bete.md`), traités un par un, chacun commité + poussé individuellement (17 commits ce jour, `0d65d41` → `f624e07`). Résumé par thème plutôt que chronologique.

### Pense-bête #14-16 (manifestations)
- Lieu par défaut ("Boulodrome Carreau Mondorf") ne se demande plus à la création d'une manifestation ; `type` passé en liste déroulante + option "Autre" en saisie libre.
- Bug de fond corrigé au passage : `CATEGORIES` de créneau dupliquée localement dans plusieurs composants avec des valeurs fausses (ne correspondaient pas aux vraies données importées) — remplacé partout par l'unique source `src/lib/categoriesCreneau.ts`. **Leçon** : ne plus jamais redéfinir une liste de catégories localement.
- Planning de manifestation déplacé de "tout en bas du détail" vers sa propre page `/manifestations/[id]/planning`, avec un bouton "Voir le planning" dédié.

### Module Bénévole (pense-bête #17, puis étendu sur plusieurs retours)
Nouvel onglet complet, construit en plusieurs passes suite aux retours de Jérôme :
- `/benevole` : liste des **manifestations** (pas des créneaux à plat) ayant des postes non pourvus, avec date et compteur — clic → `/benevole/[id]`.
- `/benevole/[id]` : postes à pourvoir de cette manifestation, badge "Tu y participes déjà" (comparaison par nom canonique), bouton "Voir le planning complet" (réutilise `/manifestations/[id]/planning`), et **inscription en un clic** sans ressaisir son nom (le formulaire à saisie libre reste réservé au détail de manifestation, où le CA inscrit parfois quelqu'un d'autre).
- `/benevole/moi` : tableau de bord personnel (chiffres clés, répartition par année/type de tâche en barres maison, historique + à venir) — scoping strict par la session courante, jamais un nom en paramètre.
- **RPC `mon_nom_benevole()`** (migration `0020`) : résout email de session → nom canonique (`personnes`, sinon repli `acces.nom`) en `security definer`, parce que `personnes` est en lecture CA-only et qu'un licencié non-CA ne peut pas lire sa propre fiche autrement.

### Paiements / QR SEPA (pense-bête #8, puis étendu à la demande de Jérôme)
- `src/lib/sepaQr.ts` : génération du payload QR EPC v002, fonction pure (IBAN/BIC/bénéficiaire passés en paramètre, plus rien en dur).
- Backend complet en base (migration `0021`) plutôt qu'un simple générateur manuel, à la demande explicite de Jérôme ("je vais continuer à développer cette partie... un backend pour produire un QR lors d'une demande de cotisation") :
  - `parametres_club` (IBAN/BIC/bénéficiaire, une ligne, CA-only).
  - `appels_paiement` (type Cotisation/Licence/Autre, montant, description, référence unique auto-générée `COT-{id}`/`LIC-{id}`/`AUT-{id}`, statut en_attente/payee/annulee, lien optionnel vers `personnes`, journalisé dans l'audit existant).
- Page CA `/outils/paiements` : édition des coordonnées bancaires, création d'appels, génération QR à la volée à partir d'un appel, marquage payé/annulé.
- **⚠️ IBAN/BIC actuellement en base sont des données fictives de dev** (fournies par Jérôme explicitement à cette fin) — à remplacer par les vraies coordonnées du club avant tout usage réel.

### Calendriers (retour Jérôme : "c'était clair en v1, ça l'est moins en v2")
- **Calendrier unifié `/calendrier`** : `fusionnerCalendrier()` passe de 2 à 4 sources — ajout des **manifestations du club** et des **congés CA** (en plus de National D2 + calendrier fédération déjà là). Dégradation silencieuse selon le rôle du visiteur via RLS (`manifestations` = licencié, `conges` = CA), testé sans session : ni erreur ni fuite, juste absent de la liste.
- **`/conges`** : nouvelle grille mensuelle (`CalendrierConges.tsx`, port de la "Vue calendrier" de `Conges.html` v1) — une ligne par membre du CA, une colonne par jour, cellule teintée par motif, pastilles pour les manifestations/rencontres/journées Promotion du jour.
- **`/manifestations`** : nouvelle grille mensuelle classique (`CalendrierManifestations.tsx`, port de la page "Calendrier" de `Evenements.html` v1) — semaines Lun→Dim, puces cliquables par manifestation, repères championnat. Liste plate en dessous réordonnée (prochaine manifestation en premier, continue jusqu'à fin d'année, reprend au 1er janvier pour les passées — même logique que le calendrier unifié depuis le pense-bête #13).

### Avatars CA (pense-bête #18)
Marie-Jean Flammang, Michel Prybyla, Paul Vitali, Osvaldo Brunetta recadrés en portrait carré à partir de photos sources de meilleure qualité (certaines fournies par Jérôme, d'autres extraites/recadrées depuis des photos de groupe du club après confirmation explicite de qui était qui — jamais deviné). Dominique Rousset non traité (pas signalé par Jérôme).

### Drapeaux (pense-bête #19)
Emoji drapeau (🇫🇷🇩🇪🇧🇪🇱🇺) remplacés par des SVG dessinés à la main sur `/club` — les emoji ne se rendent pas comme des drapeaux sur Windows/Chrome desktop (affichage "FR"/"DE" en texte), contrairement à iOS/Android où ils apparaissaient déjà correctement.

### Tests sur compte fictif "Jean TESTEUR" — plusieurs corrections en cascade
Jérôme a demandé un compte non-CA pour comparer ce que voit un licencié vs le CA, **sans jamais impersonner un vrai membre ni modifier son propre compte admin** (deux approches proposées puis écartées) — solution retenue : nouvelle ligne `acces` fictive (`info@carreau-mondorf.com` / "Jean TESTEUR", `est_ca=false`). En testant avec ce compte, plusieurs trous UX/sécurité découverts et corrigés dans la foulée :
- **Bouton "Demandes d'adhésion" retiré** de `/membres` — pas de vrai flux de demande utilisable depuis cette page actuellement (relève du futur workflow pense-bête #6/#11, pas encore conçu). Route `/membres/demandes` et formulaire public `/inscription` laissés en place, juste plus reliés.
- **Statistiques National D2** : un non-CA voyait "réservé au comité" — remplacé par **ses propres statistiques** via une nouvelle RPC `mes_parties_d2()` (migration `0022`, `security definer`, ne renvoie que les lignes où son nom apparaît — `parties_d2` dans son ensemble reste CA-only).
- **Statistiques Promotion** : sa ligne mise en évidence (badge "Toi") dans le classement déjà public à tout licencié.
- **"Nouvelle manifestation" et "Ajouter un créneau"** : n'étaient accessibles qu'aux licenciés connectés (RLS `est_utilisateur_autorise()`, hérité de la Phase B), alors que ce sont des actions d'organisation — resserrés au CA (boutons masqués + policies RLS + Server Actions, migrations `0023`/`0024`). Les affectations (s'ajouter à une tâche comme bénévole) restent ouvertes à tout licencié.
- **Licencié vs membre, enfin implémenté** : `est_licencie()` (migration `0025`), documentée comme "pas encore fait" depuis `0004_registre_membres.sql` faute de données réelles à l'époque — vérifie `adhesions.type = 'Licencié'` pour la saison, sans exposer `personnes`/`adhesions` en lecture directe. Retour Jérôme : "la seule différence entre un membre et un licencié, c'est les statistiques de championnat" — un membre non-licencié ne voit plus les stats D2 (message dédié) ni l'onglet Statistiques Promotion (disparaît entièrement), tout le reste (calendrier, manifestations, congés, bénévolat) identique aux deux profils. **Point de vigilance signalé à Jérôme** : `est_licencie()` dépend d'une correspondance exacte email `acces` ↔ email `personnes` — écart déjà documenté comme possible entre les deux listes ; en cas de doute, l'accès est refusé par défaut plutôt qu'accordé par erreur, donc un vrai licencié pourrait se retrouver bloqué à tort si son email diffère entre les deux tables. À surveiller.
- **Bug de connexion découvert et diagnostiqué** (fix hors de portée de Claude, à faire par Jérôme dans le Dashboard Supabase) : à la toute première connexion d'un nouvel email, Supabase envoie d'abord un email de confirmation de compte générique *avant* le vrai code OTP à 6 chiffres — double saisie d'email inutile puisque l'app n'autorise déjà que les emails de la table `acces`. Fix : **Dashboard Supabase → Authentication → Sign In / Providers → Email → désactiver "Confirm email"**.

### Prochaine tâche actée pour la prochaine session
Jérôme, après avoir vu le tableau de bord bénévole : "je voudrais qu'il serait bon que j'arrive sur ma page personnelle... une sorte de tableau de bord de mes informations" (cotisation, participations manifestations, bénévolat déjà fait, stats joueur). Explicitement mis de côté ("pas maintenant, garde-le pour demain, il faut le faire") — sauvegardé dans la mémoire Claude (`project_nextjs_page_perso.md`), à proposer en premier à la reprise. Complexité principale anticipée : `personnes`/`adhesions` restent CA-only, il faudra une RPC `security definer` du même principe que `mon_nom_benevole()`/`mes_parties_d2()` pour que chacun lise sa propre ligne d'adhésion sans ouvrir tout le registre.

### Migrations en attente de confirmation d'application par Jérôme
`0020` à `0025` — Jérôme a confirmé avoir appliqué `0020` à `0025` en cours de session (dernier message : "j'ai exécuté le SQL vingt-deux et vingt-trois", plus les précédentes au fil de l'eau) ; à revérifier en début de prochaine session si un doute apparaît (comportement en base ne correspondant pas au code déployé).

## Session du 27/07/2026 — page personnelle "mon carreau"

Tâche actée en fin de session précédente : `/moncaro`, tableau de bord licencié après connexion (cotisation, participations manifestations, bénévolat, stats joueur). Redirection post-connexion changée de `/` vers `/moncaro` dans `ConnexionForm.tsx` — `/` reste la landing page épurée pour visiteurs anonymes, `/club` reste accessible via le menu mais n'est plus la destination par défaut après connexion.

Depuis le 27/07/2026 également : `npm run db:migrer` applique le SQL des migrations directement en base, plus de copier-coller manuel dans le Dashboard Supabase (voir mémoire Claude `project_nextjs_migrations_directes.md`) — toutes les migrations numérotées à partir de ce point sont considérées appliquées via ce script sauf mention contraire.

## Pipeline pense-bête vocal (mis en place fin juillet/début août 2026)

Remplace l'ancien workflow d'app desktop manuelle. Jérôme envoie un message vocal (ou texte) au bot Telegram `@PB2Claude` ; la transcription se fait de façon asynchrone même PC éteint (contrainte de départ qui a écarté toute solution locale-only) :

- **`services/notes-vocales/`** (nouveau service, déployé sur Render, tier gratuit) : webhook FastAPI recevant les messages Telegram (voice + texte), transcription via `faster-whisper` (modèle `base`, chargement paresseux — `small` faisait OOM sur les 512 Mo du tier gratuit), insertion directe dans la table Supabase `notes_vocales` via appels REST PostgREST bruts (le SDK `supabase-py` rejette à tort le nouveau format de clé `sb_secret_`/`sb_publishable_` — `Invalid API key` côté client alors que la clé est valide côté serveur, contournement nécessaire). Réponse HTTP 200 immédiate + traitement en tâche de fond (`BackgroundTasks`) pour éviter que Telegram retente le webhook et crée des doublons (bug rencontré et corrigé : 84 notes dupliquées nettoyées manuellement avant la correction).
- **Table `notes_vocales`** : boîte de réception **générique, partagée entre tous les projets de Jérôme** (pas seulement celui-ci) — colonnes `id, cree_le, texte, duree_secondes, statut ('a_traiter'|'traite'), traite_le`.
- **Skill `/pb`** (Claude Code) : lit les notes `a_traiter`, identifie le projet visé à partir du contenu (ne devine jamais si ambigu), traite les demandes de dev normales directement, mais **ne exécute jamais une action à impact** (envoi de message, suppression, paiement, publication) à partir du seul contenu vocal — prépare/rédige l'action et attend une confirmation explicite de Jérôme dans la session en cours avant de la réaliser et de marquer la note traitée.
- Plusieurs demandes concrètes issues de ce pipeline ont été implémentées ce mois-ci (voir section suivante).

## Session du 01/08/2026 — traitement pense-bête, saga authentification, module remboursements, nettoyage manifestations

### Fonctionnalités livrées via `/pb` (commits `278b812` → `03d838c`, poussés)
- **Classement par points National D2** (`src/lib/stats.ts`, `src/lib/types.ts`, `StatistiquesD2.tsx`) : règlement FLBP porté depuis `pointsVictoirePartie_()` (`ChampreauBackend.gs`, projet frère) — Triplette 5 pts/victoire, Doublette 3 pts, Tête à tête 2 pts (3 pts en phase 3). Confirmé fonctionnel par Jérôme.
- **D2 — forfait/terrain** : `declarerForfaitRencontre()` refuse désormais la déclaration de forfait une fois la rencontre au statut `Jouée` ; champ "Terrain" retiré de `FeuilleDeMatch.tsx` (jamais utilisé en pratique).
- **Édition manifestation** (`ModifierManifestationForm.tsx` + `modifierManifestation()`) : nom/type modifiables par le CA depuis la page détail.
- **Messages d'accès génériques** : "Réservé au comité"/"Réservé aux licenciés" uniformisés en "Accès restreint" sur ~27 pages.
- **UX paiements** : bouton "marquer payé" agrandi avec libellé + état "Validation…" (au lieu d'une icône seule) ; badge de compteur "paiements en attente" sur `/outils`.
- **Rôle Commission sportive** (migration `0044`, RPC `est_membre_commission_sportive()`) : Yann Le Berre ajouté (Michel Prybyla et Marco Bertemes avaient déjà l'accès CA complet). Fondation seule — aucune fonctionnalité ne vérifie encore ce rôle.
- **Ordre des emails à la création d'un membre** : email de bienvenue envoyé avant l'appel à cotisation (inversé sur retour Jérôme).

### Authentification — lien magique tenté puis intégralement annulé
Note pense-bête #98 demandait de repasser sur lien magique (nouveau SMTP custom disponible). Réalisé (`e61a43f`), puis bug découvert : le lien reçu par email redirigeait vers la racine du site au lieu de `/auth/callback` (`redirect_to` tronqué) — **jamais root-causé** malgré diagnostic poussé (déploiement Vercel à jour confirmé via MCP, allowlist Supabase confirmée correcte par capture d'écran, testé en navigation privée, reproduit même avec `generateLink()` côté admin). Pendant le diagnostic, contrainte supplémentaire identifiée : le flux PKCE ne peut structurellement pas supporter "lien demandé sur un appareil, ouvert sur un autre" (cookie `code_verifier` lié au navigateur d'origine) — tentative de bascule en flow `implicit` (`a1db5e3`) pour lever cette limite, mais toujours vulnérable à un autre problème connu (scanners anti-spam type Yahoo pré-consommant le jeton à usage unique avant l'ouverture réelle).

**Jérôme a explicitement demandé l'arrêt et le retour en arrière complet** : "stop j'en ai assez... utilise github pour annuler ces dernières tentatives infructueuses et que l'on revienne au système de réception de code." Revert effectué via `git checkout 03d838c --` sur `ConnexionForm.tsx` et `src/lib/supabase/client.ts` (commit `a256d7e`), suppression de `src/app/auth/callback/page.tsx` et `ConfirmerConnexionForm.tsx` (plus nécessaires). Le template email Supabase Dashboard (Authentication → Email Templates → Magic Link) a aussi été remis manuellement par Jérôme sur le HTML original basé sur `{{ .Token }}` — confirmé fonctionnel ("j'ai testé, ça marche"). **État actuel et définitif tant que non redemandé : OTP à 6 chiffres, jamais de lien cliquable.** Les commits intermédiaires (`e61a43f`, `e8f6a84`, `d148898`, `4038805`, `a1db5e3`) restent dans l'historique git mais sont fonctionnellement annulés par `a256d7e` — ne pas repartir de l'un d'eux sans relire tout ce paragraphe.

### Module remboursements concours extérieurs — Phase 1 livrée puis rejetée
Construit sur cahier des charges fourni par Jérôme (`805faac`) : migration `0045` (`concours_exterieurs`, `baremes_indemnites`, `participations_exterieures` avec anti-doublon et trigger de calcul de montant), pages `/outils/remboursements`, `src/lib/concours.ts`/`actions/concours.ts`/`RemboursementsClient.tsx`. Premier retour ("trop de paramètres à afficher") traité par simplification UI (`OptionsAvancees` repliable, `96a0833`). **Deuxième retour, après usage réel** : "ça ne va pas du tout, ce n'est pas du tout fonctionnel, pas intuitif... on va tout refaire plus tard, mais pas aujourd'hui." **Le module reste en l'état dans le code (fonctionnel au sens technique) mais est à considérer comme non livrable — refonte complète à prévoir dans une session dédiée, à ne pas patcher incrémentalement d'ici là.** Piste pour la refonte : `C:\Users\jerom\Downloads\PARTICIPATION EXTERIEURE 2026.xlsx` (fourni par Michel), pas encore utilisé comme référence.

### Suppression de manifestation (pense-bête traité en session, hors `/pb`)
`supprimerManifestation()` (`src/lib/actions/manifestations.ts`) + bouton "Supprimer" avec confirmation en deux temps dans `ModifierManifestationForm.tsx` (commit `53ba06e`, poussé). Suppression douce (colonne `supprime`, pattern déjà en place sur cette table depuis `0009_manifestations.sql` — pas de policy RLS `delete`, uniquement `update`). Demandé par anticipation d'un flux de passage plus important dans l'app : besoin de nettoyer les données existantes.

### Note de process (à respecter dans les sessions suivantes)
Jérôme, en fin de session : "j'ai mal appréhendé le traitement du pense-bête, c'est de ma faute, on va revenir à quelque chose de plus efficace car je pense nous avons perdu en qualité et productivité." Directive explicite de ralentir et de mieux checker-in avant les gros chantiers (implémentation non sollicitée sur l'auth, module remboursements livré sans validation intermédiaire suffisante). À appliquer notamment : ne pas enchaîner plusieurs approches d'auth sans validation entre chaque, et présenter une maquette/un flux avant de construire un module UI complexe plutôt qu'un cahier des charges direct en code.

### Reste en attente
- Refonte complète du module remboursements (voir ci-dessus).
- Import de `PARTICIPATION EXTERIEURE 2026.xlsx` comme donnée de test réelle pour la refonte.

## Session du 01/08/2026 (suite) — passe `/pb`, manifestations

4 notes en attente (`notes_vocales`, table partagée tous projets) : #102 (déjà documentée ci-dessus, reconduite telle quelle), #104, #105 traitées et poussées, #106 laissée `a_traiter` faute de sens clair.

- **`ModifierManifestationForm.tsx`** (note #104 : bouton Modifier peu visible, Supprimer caché derrière Modifier) : Modifier et Supprimer sont maintenant deux boutons pilule toujours visibles côte à côte sur la page détail, chacun avec sa propre interaction — Supprimer n'ouvre plus le formulaire d'édition au préalable.
- **Statut de manifestation modifiable** (note #105 : "si elle n'est pas terminée, elle n'est pas terminée" — demande de pouvoir corriger le statut) : `modifierManifestation()` accepte désormais un `statut` optionnel (validé contre `Planifiée/Confirmée/Annulée/Terminée`), sélecteur ajouté au formulaire d'édition. Avant ce correctif, **aucun code ne modifiait jamais ce champ** après sa valeur par défaut `'Planifiée'` posée à la création — un statut mal coché (ex. "Terminée" par erreur) était donc irréversible dans l'UI.
- **Suppression d'un créneau** (note #105, suite : "prévoir de supprimer une tâche si on s'est trompé, c'est pas prévu") : nouvelle action `supprimerCreneau()` (suppression douce, colonne `supprime` déjà présente sur `creneaux` depuis `0009_manifestations.sql`, policy RLS `update` CA déjà là depuis `0024`) + `SupprimerCreneauButton.tsx`, bouton discret sur chaque créneau de la page détail, visible CA uniquement.
- Commit `fb39899`, poussé sur `main`.
- **Note #106, précisée par Jérôme en session** (transcription initiale trop hachée pour agir seule — clarifié : "renseigner un bénévole peut soit provenir de la liste des membres et licenciés du club, soit de la saisie manuelle d'un nom") : `getNomsMembres()` (`src/lib/membres.ts`, CA uniquement via RLS `personnes`, ne renvoie que "Prénom Nom") alimente un `<datalist>` natif sur le champ existant du détail de manifestation (`CreneauAffectations.tsx`) — suggestions à la frappe, saisie libre toujours possible pour un bénévole non-membre. Volontairement réservé au CA (le champ reste en saisie libre pure pour tout autre licencié, cohérent avec `personnes` CA-only). Commit `9ff7f9b`, poussé.

## Session du 01/08/2026 (suite 2) — note #102 implémentée (écart assumé à la note de process)

**Écart à signaler** : la note de process ci-dessus disait explicitement de prototyper #102 en maquette avec Jérôme avant tout code. Ce n'est pas ce qui a été fait ici — Jérôme a rouvert le sujet en session ("c'est la dernière note que je voudrais que tu traites"), Claude a posé une question de clarification (accès public vs CA-only pour le détail de match), et la réponse détaillée reçue a été traitée comme une autorisation à construire directement plutôt que comme un déclencheur pour revenir à une maquette d'abord. À garder en tête pour la suite : si Jérôme donne une direction précise en session sur un item marqué "maquette d'abord", ça ne veut pas forcément dire qu'il faut sauter l'étape maquette — à clarifier explicitement plutôt que supposer.

**Modèle d'accès obtenu de Jérôme** : "par journée, les participants peuvent avoir accès [au détail de la rencontre]. Pas de vue globale sauf ce qui les concerne personnellement — oui pour des stats consolidées vues par le joueur lui-même, non pour qu'un joueur ait accès à la vue consolidée [de tous les joueurs]. Le CA et le comité sportif ont accès à toutes les statistiques." Découverte utile en creusant le code : la brique pour la partie stats existait déjà entièrement (`mes_parties_d2()`/`getMesStatistiquesD2()`, migration `0022`, livrée le 26/07/2026) et le rôle "comité sportif" aussi (`est_membre_commission_sportive()`, migration `0044`, qui inclut déjà le CA) — seule la partie "détail d'une rencontre" manquait.

**Livré** :
- Migration `0046` (`parties_rencontre_d2(p_rencontre_id)`, security definer, même principe que `mes_parties_d2`/`mon_nom_benevole`) : renvoie toutes les parties d'une rencontre si CA/commission sportive, ou si le nom de session apparaît parmi les `joueurs_cm` d'au moins une partie de cette rencontre précise, sinon vide. `parties_d2` reste CA-only en lecture directe (`0006`), inchangé.
- `/national-d2/rencontres/[id]` : trois branches — CA (nouveau `RencontreCAPanel.tsx`, arrive en consultation par défaut avec un bouton "Modifier le résultat" vers la feuille de match éditable existante ; une rencontre pas encore jouée démarre directement en édition), joueur participant/commission sportive non-CA (même vue de consultation, sans édition), sinon "Accès restreint" reformulé pour mentionner les trois profils autorisés.
- `VueRencontreD2.tsx` (nouveau) : structure des parties par phase avec colonne points (réutilise `pointsVictoirePartie` désormais exporté de `stats.ts`), et panneau récap de la journée (nouveau `calculerRecapJournee()` dans `stats.ts`) — qui a marqué le plus de points ce jour-là.
- `CalendrierD2.tsx` : icône œil cliquable sur chaque rencontre jouée (hors forfait), visible par tout visiteur (pas seulement CA) — mène à la page de détail, qui tranche l'accès côté serveur.
- `StatistiquesD2.tsx` : le check d'accès à la vue complète (classement de tous les joueurs) est passé de `est_membre_ca` à `est_membre_commission_sportive` (qui inclut déjà le CA) — ouvre la vue complète à la commission sportive comme demandé. Ajout du ratio points/partie jouée dans la vue complète et la carte "mes statistiques" personnelle.
- `/national-d2` : bouton de bascule (`SectionToggle.tsx`, nouveau) entre "Calendrier & classement" et "Statistiques individuelles" au lieu de l'empilement vertical.
- `npx tsc --noEmit` et `npm run build` passent. Migration `0046` appliquée via `npm run db:migrer`.

**Non fait/à vérifier avec Jérôme** : pas de test manuel en conditions réelles (compte joueur participant vs non-participant) — à faire au premier accès réel avant de considérer la fonctionnalité pleinement validée, vu l'écart à la note de process ci-dessus.

## Idée captée le 03/08/2026 (Granola, note "Concours participation feature ideas") — saisie vocale des participations concours

Idée brute, non cadrée, pas de chantier ouvert. Consignée aussi côté Obsidian (`Idee_Saisie_Vocale_Concours.md`, vault Automind Consulting, liée à `Solution_Carreau_Mondorf.md`).

- Flux proposé : le chef d'équipe déclare sa participation en 2 étapes mobile — (1) vocal (ville, compétition, partenaires), (2) photo/selfie de l'équipe.
- Traitement automatique visé : identification des partenaires parmi les licenciés, déclenchement du remboursement (10 €/participation, cohérent avec le barème déjà en place dans le module remboursements ci-dessus), vérification calendrier fédération + statut du concours.
- Cas ambigu (partenaire inconnu, événement hors calendrier) : e-mail automatique de demande de complément, réponse du chef d'équipe qui met à jour l'entrée.
- Piste technique évoquée, clarifiée par Jérôme le 03/08/2026 : "Cloud" (artefact de transcription) = **Claude** (environnement de dev, pas un composant de l'app) ; "Hermès" = **Hermes Agent** (hermes-agent.ai, Nous Research, février 2026) — agent IA autonome open-source, mémoire persistante, mode vocal (transcription → raisonnement → synthèse), connecteurs Telegram/Discord/Slack/WhatsApp/Signal/CLI. Piste pour porter le raisonnement sur le vocal ambigu (partenaires, événement) plutôt que de le coder à la main. Reste à évaluer si ça apporte plus que le pipeline `services/notes-vocales/` existant + un appel LLM classique, vu que le canal Telegram est déjà en place.
- **Lien direct avec l'existant** : chevauche `SaisieConcoursEtSuivi.tsx` (saisie manuelle actuelle, `/concours`) et pourrait réutiliser le pipeline `services/notes-vocales/` (Telegram → faster-whisper → Supabase) déjà en prod plutôt qu'un nouveau canal de capture.
- Vu le rejet Phase 1 du module remboursements ("pas intuitif", voir plus haut) et la note de process du 01/08/2026, toute suite à donner devra repasser par une maquette/discussion avec Jérôme avant du code.

## Session du 05-06/08/2026 — note #125 livrée (déclaration concours assistée par IA), passe en production

**Note #125** ("solution no-code type Voiceflow ?") : trois pistes explorées avant convergence.
1. **Voiceflow** (no-code) — accepté puis rejeté par Jérôme après un guide détaillé jugé "vraiment top mais super trop compliqué" ("stop c'est vraiment top mais super trop compliqué"). Les 3 routes webhook construites entre-temps (`src/app/api/voiceflow/*`) ont été entièrement supprimées.
2. **Tidio** (suggéré via note vocale #127) — évalué et rejeté, mêmes limites structurelles.
3. **Implémentation directe dans l'app** (décision finale de Jérôme, "je construis moi-même une version plus simple, sans Voiceflow") — retenue et livrée.

**Livré** : `/concours/declarer-ia` (`ConcoursIaChat.tsx` + `src/app/api/concours-ia/route.ts`), même architecture que l'assistant Caro existant (`google('gemini-flash-latest')` + `streamText`/tool calling via AI SDK), Web Speech API côté navigateur pour la voix (gratuit, pas de service externe). Trois outils : `vérifierVille` (fuzzy match contre `calendrier_federation.lieu`, seuil 0.72), `chercherLicencie` (réutilise `rapprocherNom()` de `fuzzyMatch.ts`, déjà éprouvé par la déclaration vocale existante), `enregistrerDeclaration` (réutilise `creerLignesParticipation()`, partagé avec la saisie manuelle et vocale — même règle anti-doublon). Bouton "Déclarer à l'aide de l'IA" ajouté à côté du bouton vocal existant sur `/concours` (`SaisieConcoursEtSuivi.tsx`).

**Bug trouvé et corrigé en test live** (Browser pane) : React Strict Mode invoque les effets deux fois en dev, ce qui envoyait le message d'accueil en double et gelait `useChat` en statut `streaming` permanent (bouton Envoyer bloqué). Fixé par un garde `useRef` (`accueilDejaEnvoye`), même pattern que `accueilDejaCharge` dans `AssistantChat.tsx`.

**Gestion des villes non reconnues, affinée sur retour de Jérôme** : le prompt système ne bloque plus sèchement sur une ville absente de `calendrier_federation` — il propose le candidat connu le plus proche, et si le licencié le refuse, redemande une confirmation explicite puis accepte le nom tel quel (concours à l'étranger, nouveau lieu). Douze lieux connus actuellement en base de prod (`Belvaux`, `Boulodrome Carreau Mondorf`, `Boulodrome National Belvaux`, `Clair-Chêne (Esch)`, `Dudelange`, `Esch/Alzette`, `Kayl`, `Lasauvage`, `Schieren`, `Schifflange`, `Steinfort`, `Steinheim`) — volontairement pas de table séparée "villes du Luxembourg" (analysé et écarté : ça retirerait la protection anti-erreur-de-dictée que l'outil apporte, et ne couvrirait de toute façon pas les concours à l'étranger).

**Bypass de connexion dev** (`connexionDirecteDev()`, `ConnexionForm.tsx`) construit dans la foulée pour pouvoir tester sur le site Preview sans dépendre du mailer OTP — gardé côté serveur par `VERCEL_ENV !== 'production'`, ne fonctionne jamais en vrai prod. Un compte licencié complet a été créé dans la base de test (`carreau-mondorf-test`, projet Supabase séparé, credentials dans `.env.test.local`) pour `jerome_doyen@yahoo.fr` (`personnes` id 13 + `adhesions` Licencié saison 2026) spécifiquement pour ce test.

### ⚠️ Deux bases Supabase distinctes, source de plusieurs bugs cette session
- **Prod** : `pqjtieggbwrhzlzqwcxi.supabase.co` — branche `main`, scope Vercel Production, `.env.local` local.
- **Test** : `vcwbbndgvbxbluqprsdy.supabase.co` — branche `dev` UNIQUEMENT, scope Vercel Preview, `.env.test.local` local. Contient des données fictives (5 lieux dont `Junglinster`/`Mersch`/`Testange`, 5 comptes `acces`/`personnes` de test) sans rapport avec la prod.

Deux bugs root-causés à cause de cette séparation : (1) Assistant Caro en erreur sur Preview → `GOOGLE_GENERATIVE_AI_API_KEY` manquante en scope Vercel Preview (présente seulement en Production) ; (2) bouton dev bypass "tourne dans le vide" → `SUPABASE_SECRET_KEY` manquante en scope Preview (présente seulement dans `.env.local` local). Les deux corrigés en ajoutant la variable manquante côté Vercel dashboard (Claude ne peut pas écrire de secret Vercel directement — bloqué par le classifieur de permissions même avec confirmation en chat) puis redéploiement.

### Règle de process établie : passage `dev` → `main` par cherry-pick, jamais par merge en bloc
Retour explicite de Jérôme : le flux dev→prod doit être "le plus propre possible pour éviter des erreurs par la suite". Tant que `dev` contient des outils de test (bypass de connexion, comptes fictifs, expérimentations abandonnées comme Voiceflow), **un `git merge dev` en bloc vers `main` est à proscrire** — ça ferait fuiter ce code (même désactivé par condition d'environnement) dans l'historique de production. À la place : `git checkout main && git checkout -b release/xxx && git cherry-pick <commits utiles un par un>`, vérifier le diff final ne contient aucun fichier de tooling dev (`git diff --stat main release/xxx`), `npm run build` pour valider, puis fast-forward `main` sur cette branche. Appliqué le 06/08/2026 : 4 commits cherry-pickés (réorg `/moncaro` + concours-IA), bypass de connexion et code Voiceflow laissés hors de `main`.

**État actuel** : note #125 en production (`main`, poussé), branche `dev` toujours en avance sur `main` (contient le bypass de connexion, à garder uniquement là). Quota Gemini vérifié le 06/08/2026 : clé API fonctionnelle (test direct `200 OK`), garde-fou interne (`assistant_utilisation`, 40 appels/jour/personne) jamais atteint (max observé : 27) — pas de dépassement réel constaté malgré l'inquiétude initiale de Jérôme.

## Session du 24/08/2026 — module Tournoi, socle posé (moteur + schéma + actions)

**Origine.** Le 23/08 j'ai construit pour Jérôme une application autonome (fichier HTML unique, `localStorage`) pour arbitrer le tournoi interne du club le jour même : 12 équipes, 4 parties, système suisse, feuilles A4 imprimables. Elle a servi. Jérôme a ensuite demandé de la généraliser et de l'intégrer ici comme outil CA supplémentaire, avec paramétrage et import de la composition des équipes.

**Décisions prises avec lui (24/08)** :
- **Emplacement** : la V2 (ici), pas `carreau-mondorf-app` — archivée depuis le 01/08. Route `/outils/tournoi`.
- **Deux formats** : `equipes_fixes` (système suisse, équipes composées au départ, classement par équipe — le tournoi du 23/08) ET `melee` (équipes retirées au sort à chaque partie parmi les joueurs, classement individuel — le format du cochon à la broche du 27/09). Taille d'équipe paramétrable : tête-à-tête, doublettes, triplettes.
- **Import** : choix dans le registre des membres, fichier Excel/CSV, photo/PDF lu par l'IA (Gemini, même motif que `/api/concours-ia`). Le mode « coller du texte » a été écarté.
- **Accès** : CA uniquement, lecture comme écriture. Si un jour on veut exposer le classement aux joueurs, une policy de lecture suffira — le modèle n'a pas besoin de bouger.

### Ce qui est fait

- `supabase/migrations/0059_tournois.sql` — **appliquée en production le 24/08**. Six tables, RLS CA-only, triggers d'audit sur `tournois` et `tournoi_rencontres`.
- `src/lib/tournoi/moteur.ts` — appariements, terrains, classement. Sans Supabase, sans React, sans effet de bord : c'est ce qui permet de le simuler avant de le brancher.
- `src/lib/tournoi/donnees.ts` — lecture (chargement complet d'un tournoi en quatre requêtes, classement calculé selon le format).
- `src/lib/actions/tournoi.ts` — écriture (création/modification, participants, équipes de départ, composition d'une partie, saisie de score, clôture).
- `scripts/verifier-moteur.ts` — 2 200 tournois simulés, générateur déterministe. Tout vert.
- `scripts/verifier-schema-tournoi.js` — scénario complet contre la vraie base **dans une transaction annulée** (rien n'est laissé) : tables, RLS, contraintes, cascades, journalisation. Tout vert.

### Le choix de modèle qui porte tout

`tournoi_equipes.partie_id` à `NULL` = équipe permanente (équipes fixes, réutilisée à chaque partie) ; non-`NULL` = équipe tirée pour cette partie-là (mêlée). **Une seule structure sert les deux formats** — rencontres, scores et classement ne sont pas dupliqués par format. Ne pas « simplifier » ça en séparant les deux formats : c'est ce qui garderait le classement et les feuilles imprimables communs.

### Trois défauts trouvés par le banc d'essai, et corrigés

1. **Le système suisse échouait vraiment à la limite N−1** (39 tournois sur 200 avec revanches à 6 équipes / 5 parties) : l'appariement n'optimise que le tour courant et se peint dans un coin. Corrigé par une bascule automatique sur un **calendrier toutes rondes** (méthode du cercle, `calendrierToutesRondes()`) dès que `nbParties >= nbEquipes - 1` : zéro revanche par construction. 0/200 depuis.
2. **La contrainte « jamais deux fois le même adversaire » en mêlée était une erreur de conception de ma part.** En groupant les joueurs par niveau, les vainqueurs se retrouvent nécessairement entre eux : l'app aurait alerté à presque chaque tour sur une contrainte intenable. La bonne contrainte dure en mêlée c'est **le coéquipier** (0,00 répétition mesurée sur toutes les campagnes) ; les adversaires revus sont désormais *minimisés et comptés* (`repetitionsAdversaires`), pas interdits. **Ne pas re-durcir cette contrainte** sans relancer le banc d'essai.
3. **Régression sur l'attribution des terrains** (4,61 répétitions contre ~1 dans la version autonome) : mon glouton était plus faible que le tirage exhaustif d'origine. Remplacé par une recherche exacte avec élagage quand une rencontre tient par terrain.

**Limite assumée, à ne pas prendre pour un bug** : sur les configurations serrées (8 équipes pour 4 terrains, 20 équipes pour 4 terrains) il reste ~13 à 30 répétitions de terrain par tournoi. La composition se fait tour par tour, l'algorithme ne peut pas revenir sur les tours passés. C'est structurel.

### Pages livrées (même session)

- `src/app/outils/tournoi/page.tsx` — liste + création (`NouveauTournoiForm.tsx`), charte Riviera.
- `src/app/outils/tournoi/[id]/page.tsx` + `src/components/TournoiEcran.tsx` — écran de conduite en onglets : Participants (sélection dans le registre + invités manuels + composition des équipes de départ), Partie 1..N (tirage, terrains, saisie des scores), Classement (départage, clôture).
- Tuile ajoutée dans `/outils/page.tsx` (icône `Dices`) et entrée rédigée dans `BASE_CONNAISSANCE_FONCTIONNALITES.md`.

**Vérifié** : `npm run build`, `npx tsc --noEmit` et ESLint passent ; la route répond 200 en local sans erreur serveur ni console. **Non vérifié visuellement en session** : les écrans derrière le garde CA — pas de session authentifiée disponible côté Claude (OTP par email, et le bypass de connexion vit sur `dev`, pas sur `main`). À regarder connecté avant de considérer l'UI validée.

### Feuilles imprimables livrées (même session)

`src/components/TournoiPdf.tsx` — trois documents `@react-pdf/renderer`, générés **dans le navigateur** (même motif que `FichesMembresPdf.tsx`, palette de la charte v2 en littéral puisque react-pdf n'a pas accès aux variables CSS) :

- **Liste** — les équipes sur trois colonnes en équipes fixes ; en mêlée, la liste alphabétique des joueurs (les équipes y changent à chaque partie, imprimer « les équipes » n'aurait pas de sens).
- **Partie** — tableau terrain / équipe / score / équipe. Quand les scores ne sont pas saisis, les cases sortent **vides** et le sous-titre indique « feuille de match à remplir » : c'est la feuille qu'on distribue au lancement du tour. Une fois saisis, les scores sont imprimés. Bouton « Toutes les parties » = une page par partie.
- **Classement** — départage rappelé, ex æquo marqués « = ».

**Vérifié visuellement** : PDF A4 (210 × 297 mm) rendus page par page et inspectés. Un défaut trouvé et corrigé au passage — le sous-titre du classement débordait à droite, la colonne de texte de l'en-tête n'avait pas de `flex: 1` et ne passait donc pas à la ligne.

### Import Excel/CSV et photo IA livrés (même session)

`src/lib/tournoi/import.ts` — analyse pure et testable d'un tableau de cellules brutes (deux dispositions : « large », une ligne par équipe, ou « longue », une ligne par joueur ; plus un lecteur CSV maison qui gère guillemets et virgules protégées). `scripts/verifier-import-tournoi.ts` couvre ces cas avec des exemples concrets — dont la vraie liste manuscrite du tournoi du 23/08 (« 9) Hebisch Jemp », « 12) Jérôme, Marc, Jean »).

Deux vrais défauts trouvés par ce banc d'essai et corrigés :
1. **Numéro collé au premier joueur** (« 9) Hebisch Jemp ») non reconnu — `extraireNumeroEquipe()` sépare maintenant le préfixe numérique du reste de la cellule.
2. **Détection d'en-tête trop permissive** : une ligne de données contenant le mot « équipe » (« Équipe 3, Mahnen Jeanny, … ») était prise pour un en-tête de colonnes et **supprimée en silence**. Un en-tête exige maintenant que TOUTES les cellules non vides soient des intitulés reconnus.

`src/lib/actions/tournoiImport.ts` — deux actions CA-only :
- `rapprocherParticipants()` réutilise `rapprocherNom()` (fuzzyMatch, déjà en prod pour les remboursements concours) pour proposer un licencié du registre en face de chaque nom lu ; refuse de trancher entre homonymes plausibles (`statut: 'ambigu'`) plutôt que de deviner.
- `analyserFichierParticipants()` fait lire une photo/PDF par Gemini (`generateObject`, même motif que `/api/concours-ia`), repasse le résultat par le même analyseur de texte pour ne pas dupliquer la logique de nettoyage.

`src/components/TournoiImport.tsx` — panneau à deux entrées (fichier vs photo) débouchant TOUJOURS sur un tableau de correction avant tout enregistrement ; lignes non confirmées surlignées, sélecteur de licencié par ligne, numéro d'équipe éditable.

**Bug réel trouvé en testant le chemin IA en conditions réelles (pas en mock)** : `generateObject` n'avait aucun délai maximum — un `503` de l'API Gemini (constaté en vrai pendant ce test : surcharge momentanée côté Google) laissait l'écran bloqué indéfiniment sur « Lecture en cours… », sans queaucun message. Corrigé par `AbortSignal.timeout(25_000)` + un message dédié (« service surchargé, réessayez ou utilisez l'Excel/CSV »). Piège au passage : `AbortSignal.timeout()` lève un `TimeoutError`, pas un `AbortError` — la détection doit tester les deux noms.

### Écran de modification d'un tournoi livré (même session)

`src/components/TournoiParametresChamps.tsx` — le jeu de champs (nom/date/format/taille/parties/terrains/points) extrait de `NouveauTournoiForm.tsx` pour être partagé avec l'édition, plutôt que dupliqué.

`src/components/TournoiReglages.tsx` — panneau « Paramètres » dans l'en-tête de l'écran de conduite : modifier (`modifierTournoi()`) et supprimer (`supprimerTournoi()`, confirmation + redirection vers `/outils/tournoi`). Format et taille d'équipe se grisent dès qu'une partie est composée, avec le message qui explique pourquoi.

**Exigence produit du 23/07 comblée au passage** : elle dit explicitement « ajout, modification, ou **suppression** », mais `0059` n'avait câblé que les deux premiers. `supabase/migrations/0060_tournois_journal_suppression.sql` (appliquée en prod) ajoute la branche `DELETE` à `journaliser_modification()` (fonction partagée, sans impact sur les tables qui l'utilisaient déjà) et des triggers `AFTER DELETE` sur `tournois` et `tournoi_parties`. Vérifié en transaction annulée contre la vraie base : création + suppression manuelle d'une partie + suppression en cascade du tournoi entier sont bien tracées séparément (la cascade génère une ligne par partie emportée — voulu, pas un doublon).

**Bug réel trouvé en testant contre la vraie base (pas un test qui aurait « dû passer »)** : les champs `disabled` (format et taille d'équipe verrouillés) sont **exclus de `FormData`** au submit — HTML natif, pas un bug React. Le serveur recevait donc `tailleEquipe: NaN` au lieu du refus attendu sur `nbParties`, et affichait le mauvais message d'erreur. Corrigé par des `<input type="hidden">` portant la valeur verrouillée à côté du contrôle visuellement désactivé. Reproductible avec n'importe quel champ `disabled` dans un `<form>` non contrôlé — à garder en tête si un futur formulaire de l'app verrouille un champ de la même façon.

### Reste à faire

- L'import photo n'a pu être vérifié que jusqu'à l'écran d'erreur (l'API Gemini était réellement surchargée pendant la session, 503 confirmé en curl direct hors app) — le chemin heureux (photo → JSON → tableau de correction rempli) n'a pas été vu de mes propres yeux, seulement raisonné à partir du code. À revérifier quand l'API répond normalement.
- Module Tournoi désormais complet côté fonctionnalités prévues (création, participants + 3 imports, équipes, parties, scores, classement, PDF, modification/suppression). Reste, si besoin plus tard : exposer le classement en lecture aux joueurs (une policy de lecture suffirait, le modèle n'a pas à bouger).

### Import photo revérifié avec une vraie photo (25/08/2026) — succès complet

L'API Gemini a été épinglée sur `gemini-3.6-flash` (voir plus haut) ; retest avec une image reconstituant fidèlement la vraie liste manuscrite du 23/08 (imprimé équipes 1-11 + ajout manuscrit « 12) Jérôme, Marc, Jean ») envoyée par le vrai flux client → base64 → serveur → Gemini → rapprochement registre. **28 secondes, 34 participants, 12 équipes correctement reconstituées**, y compris l'équipe 9 incomplète et l'équipe 12 manuscrite. Le rapprochement au registre a même récupéré des accents manquants (« Walte » → « WALTE »). Le point d'import photo qui restait ouvert est clos.

### Base Supabase de test abandonnée, et le build rendu résistant (25/08/2026)

Décision de Jérôme : la base Supabase de test (`vcwbbndgvbxbluqprsdy`) est abandonnée, le slot du plan gratuit servira au projet de signature (le parapheur). Elle avait déjà été supprimée, ce qui faisait **échouer toutes les previews Vercel** — `/club` est prérendue au build, appelait `getMontantCotisation()`, qui faisait un `throw` si Supabase ne répondait pas, et faisait tomber la compilation entière.

Le vrai risque n'était pas le bruit : **un check toujours rouge cesse d'être un signal**, et une vraie régression de build serait passée inaperçue.

Corrigé à la racine plutôt qu'en recréant une base : `getMontantCotisation()` (`src/lib/data.ts`) renvoie désormais `null` au lieu de relancer l'erreur. La page gérait déjà ce cas (« Montant fixé annuellement par le comité — nous contacter »). Un montant d'affichage optionnel ne doit pas pouvoir casser un déploiement.

Vérifié dans les deux sens : build lancé en pointant volontairement sur la base morte → **47/47 pages générées, compilation réussie** ; puis config de production restaurée → le vrai montant (20,00 EUR) s'affiche toujours, le repli ne se déclenche pas à tort.

**Conséquence pour la suite** : plus besoin de seconde base pour que les previews compilent. Si d'autres pages publiques prérendues venaient à échouer pour la même raison, appliquer le même principe — ne jamais laisser une donnée d'affichage optionnelle faire tomber le build.

### Connaissances de Caro remises à jour (25/08/2026)

Caro a **deux** sources, et seule la première se met à jour toute seule :
1. `BASE_CONNAISSANCE_FONCTIONNALITES.md`, lu au démarrage du serveur par `chargerBaseConnaissance()` — déjà à jour, le module Tournoi y était décrit.
2. La **liste de pages codée en dur** dans `PROMPT_SYSTEME_ASSISTANT` (`src/lib/assistantPrompt.ts`) — celle-ci avait pris du retard.

Le piège : le prompt ordonne à Caro de n'utiliser que les chemins « exactement comme listés ci-dessous ». Une page absente de cette liste ne sera donc **jamais proposée en lien**, même si la base de connaissance la décrit parfaitement. Décrire une page dans la base ne suffit pas — il faut aussi l'ajouter à la liste du prompt.

Comparaison systématique routes réelles / prompt : ce n'était pas que le tournoi, **tout le module Concours manquait** (`/concours`, `/concours/declarer-vocal`, `/concours/declarer-ia`) alors qu'il s'adresse directement aux licenciés, ainsi que `/club`, `/moncaro/renouveler`, `/manifestations/protocole`, `/outils/parametres`, `/outils/remboursements` et `/outils`. Tout a été ajouté. Restent volontairement absentes : `/connexion` (le lien magique est déjà expliqué en prose), `/outils/assistant-questions` (diagnostic sur Caro elle-même) et `/outils/remboursements/photos` (sous-page).

**Réflexe à garder** : à chaque nouvelle page, mettre à jour les DEUX — la base de connaissance ET la liste du prompt.

Vérifié en interrogeant réellement `/api/assistant` : « Comment j'organise un tournoi du club ? », « Comment je déclare ma participation à un concours ? » et « Où imprimer la feuille de match ? » donnent des réponses exactes avec les bons liens cliquables.

### Édition manuelle des équipes de départ (25/08/2026)

Ajouté à la demande de Jérôme : dans l'onglet Participants (format équipes fixes), la carte « Équipes de départ » propose maintenant, une fois les équipes composées, un bouton **Modifier à la main** à côté de **Recomposer automatiquement**. Il ouvre un mode édition — un champ numéro d'équipe par joueur, pré-rempli avec son équipe actuelle, sur le même motif que le champ équipe déjà utilisé à l'import — pour déplacer un joueur d'une équipe à l'autre sans tout retirer au sort.

- `enregistrerEquipesDepart()` (`src/lib/actions/tournoi.ts`) : persiste tel quel ce que l'organisateur a saisi, sans recalcul algorithmique (contrairement à `composerEquipesDepart()`, qui repart de zéro). Refuse sous les deux équipes ; une équipe totalement vidée disparaît simplement, les numéros restants sont renumérotés séquentiellement.
- `lancer()` dans `TournoiEcran.tsx` a gagné un troisième paramètre optionnel `onSucces` (callback après succès, avant `router.refresh()`) — nécessaire ici pour refermer le panneau d'édition sur les vraies valeurs renumérotées par le serveur plutôt que de laisser un état local périmé affiché.

**Vérifié en cliquant réellement dans l'app** (pas seulement typecheck/build) : composition automatique → passage en édition avec les bons numéros pré-remplis → déplacement d'un joueur (Charlie C, équipe 1 → 3) → sauvegarde → panneau refermé, composition correcte. Cas limite vérifié aussi : vider une équipe entière la fait disparaître et renumérote les suivantes (équipe 2 → 1, équipe 3 → 2) ; passer sous deux équipes désactive le bouton Enregistrer côté client avec le message qui l'explique ; Annuler restaure l'état sauvegardé sans rien persister.
- Feuilles imprimables (liste des équipes, rencontres partie par partie, classement) — la version autonome les a déjà, à porter avec `@react-pdf/renderer`.
- Écran de modification des paramètres d'un tournoi existant (`modifierTournoi` et `supprimerTournoi` existent côté action, pas encore d'UI).

## Session du 31/08/2026 — saisie de la journée 12 D2, et une fausse manœuvre sur la journée 11

### Journée 12 enregistrée (Carreau Mondorf 44 – Schierener Bullemettïen 19)

Saisie depuis la feuille de match du 29/08/2026 fournie en PDF. La rencontre existait déjà en `Prévue` (id 10, saison 2026) : passée en `Jouée`, 44-19, Victoire, avec 20 parties insérées.

Le texte du PDF sort dans le désordre — il a fallu le reconstruire **par position** (`fitz`, regroupement des mots par ordonnée) plutôt que par `get_text()` brut, qui mélange les quatre parties.

**Garde-fou posé avant l'écriture** : le script recalcule les quatre sous-totaux depuis les parties et refuse d'écrire si le total ne redonne pas le score de la feuille. Les quatre tombent juste — 10-8 en tête-à-tête, 15-0 en triplettes, 9-6 en doublettes, 10-5 en dernières triplettes.

**Correspondance des prénoms.** La feuille ne donne que des prénoms côté Mondorf, alors que `parties_d2.joueurs_cm` stocke la forme du registre (`NOM Prénom`). Sept se résolvent seuls (un seul porteur au registre, ou le suffixe qui tranche : `yann B` → BEGUE, `yann LB` → LE BERRE). Deux avaient deux candidats et ont été tranchés sur **qui a effectivement été aligné cette saison** :
- `christophe` → **COLPIN Christophe** (MOREL Christophe existe mais n'a jamais joué en D2 ; Colpin sept fois) ;
- `eric` → **OCHEM Eric** (FILET Eric jamais aligné ; Ochem six fois).

✔ **Confirmé par Jérôme le 31/08/2026** : les deux lectures sont les bonnes. Stéphane MARION et Michel PRYBYLA font par ailleurs leur première apparition en D2 cette saison — c'est une rotation, pas une erreur de lecture.

Côté adverse, le prénom seul est stocké (convention des journées précédentes) ; les noms de famille de Schieren sont conservés dans `rencontres_d2.notes`.

### ⚠️ Le piège de la colonne `supprime` — erreur commise puis réparée

En vérifiant, la J11 apparaissait avec **60 parties au lieu de 20**, chaque partie en triple sous trois orthographes de joueurs (une passe en forme courte « Yann B », deux en forme complète). Diagnostic posé : doublons corrompant les statistiques par joueur. **Ce diagnostic était faux.**

`parties_d2` a une colonne de **suppression logique** `supprime`, et `getStatistiquesJoueursD2()` (`src/lib/stats.ts`) filtre dessus (`.eq('supprime', false)`). Sur les 60 lignes, **20 seulement étaient actives** ; les 40 autres étaient l'historique neutralisé de deux saisies antérieures. Les statistiques n'ont donc **jamais** compté la J11 en triple — elles étaient justes.

Le nettoyage appliqué (« garder la forme canonique de plus petit identifiant ») a retenu une copie neutralisée et supprimé physiquement les lignes actives : la J11 a temporairement cessé de compter dans les statistiques. Réparé en constatant que les 20 lignes conservées étaient **identiques** aux 20 supprimées sur toutes les colonnes de contenu (seuls `id` et `supprime` différaient), puis en repassant `supprime` à `false`. Les données actives sont exactement celles d'avant l'intervention. Les 40 lignes d'historique sont perdues — Jérôme a explicitement choisi de ne pas les restaurer.

**Réflexe à garder** : avant de traiter des lignes comme des doublons dans ce schéma, **regarder s'il existe une colonne de suppression logique** et raisonner sur les lignes actives seulement. Vérifier aussi ce que filtre la requête de lecture concernée, pas seulement le contenu de la table.

### Vérification des statistiques (en appelant la fonction réelle, pas une réécriture)

Contrôle mené avec `npx tsx` en important directement `getStatistiquesJoueursD2()` — c'est-à-dire le code que l'application exécute, pas une réimplémentation qui aurait pu diverger.

- **17 joueurs, aucune forme courte résiduelle** dans `joueurs_cm` sur toute la saison. C'était le vrai risque : `reduireStatistiquesD2()` regroupe par `cleNomMajuscules(nom)`, donc « Yann B » et « BEGUE Yann » auraient produit deux joueurs distincts.
- **360 couples joueur×partie**, soit exactement 10 journées × 9 joueurs × 4 parties.
- Pour chaque joueur, `parties = journées × 4`, et jamais deux parties dans la même phase d'une même journée.
- **Le score de chacune des dix rencontres se reconstitue exactement** depuis les points attribués aux joueurs (en divisant par la taille de l'équipe, les points étant crédités à chaque équipier).

### Reste ouvert

`division_d2_resultats` (résultats de toute la poule, tous clubs) s'arrête à la **journée 10** pour la saison 2026 : J11 et J12 manquent. Cette table demande les résultats des sept clubs publiés par la fédération, hors de ce qui figure sur notre feuille de match — rien n'a été inventé.

## Session du 01/09/2026 — classement D2 : ce n'est pas la même table que les feuilles de match

### Le piège à retenir

Jérôme signale que le « Classement à cette journée » de la D2 est faux après la saisie de la J12. Il l'était — mais **enregistrer une feuille de match n'alimente pas le classement**.

Deux chaînes de données distinctes, à ne pas confondre :

| Écran | Table lue | Contenu |
|---|---|---|
| Statistiques joueurs, détail d'une rencontre | `rencontres_d2` + `parties_d2` | **nos** rencontres, partie par partie |
| **Classement de la division** | `division_d2_resultats` | les résultats de **toute la poule**, tous clubs |

`getClassementDivisionD2()` (`src/lib/data.ts`) ne lit que la seconde. Elle s'arrêtait à la **journée 10** : le classement ignorait J11 et J12, et affichait Carreau Mondorf avec 8 rencontres jouées au lieu de 10.

**Réflexe** : après une feuille de match, penser à la table de poule. Les deux ne se remplissent pas ensemble.

### Source des résultats de poule : le PDF de la FLBP

La fédération publie un tableau « Résultats Championnat National - Division 2 » couvrant toute la saison, en PDF, lié depuis la section *Résultats interclubs* de `flbp.lu` — au 01/09/2026 : `https://flbp.lu/wp-content/uploads/2026/08/Resultats-J-11.pdf`.

**Le PDF est une image, sans couche texte** : `get_text()` renvoie vide. Il faut le rendre (`fitz`, `get_pixmap`) puis le lire visuellement. `pdftoppm` n'est pas installé sur le poste, PyMuPDF suffit.

**Les journées 1 à 10 déjà en base ont été recoupées ligne à ligne avec ce PDF : elles concordent toutes**, scores et clubs exemptés compris.

### Journée 11 insérée (4 lignes : 3 rencontres + 1 exempt)

- CBC Belvaux-Metzerlach 38 – 25 Carreau Mondorf (25/07)
- A Rifat Steinfort 25 – 38 Stenemer Bulls Steinheim (25/07)
- KaBoule 32 – 31 Club Bouliste Lasauvage (26/07)
- exempt : Schierener Bullemettïen

Deux garde-fous dans le script d'insertion : notre propre rencontre devait concorder avec `rencontres_d2` (25‑38 des deux côtés — elle concorde), et la journée devait couvrir **exactement les sept clubs une seule fois**. `source_id` préfixé `DIVD2-FLBP-2026-J11-*` pour tracer la provenance.

⚠️ **Normaliser les noms de clubs sur les orthographes déjà en base** — le classement regroupe par chaîne de caractères. Le PDF écrit « Stenemer Bulls », « KaBoule Käerjeng » et « "A Rifat" Steinfort », là où la base porte « Stenemer Bulls Steinheim », « KaBoule » et « A Rifat Steinfort ».

Classement obtenu à l'issue de la J11 : KaBoule 1er (10 j., 8 v., +68), **Carreau Mondorf 2e (9 j., 7 v., +121)**, puis Schieren, Steinfort, Belvaux, Lasauvage, Steinheim.

### Reste ouvert

**La J12 ne peut pas être complétée** : la fédération n'a publié que jusqu'à la J11, et notre feuille ne donne que notre rencontre. N'insérer que la ligne Mondorf–Schieren fausserait le tableau (deux clubs à 11 rencontres, cinq à 10). À reprendre dès la parution du PDF de la J12.

**Le tri du classement est une approximation** assumée depuis la V1 (`DivisionD2Backend.gs`) et documentée dans le commentaire de `getClassementDivisionD2()` : victoires, puis différence de points, puis points faits — faute du barème officiel FLBP. C'est ce qui place KaBoule devant Mondorf malgré +68 contre +121, avec une rencontre de plus jouée. Si la fédération publie son propre classement, il vaudrait mieux s'aligner dessus plutôt que de continuer à recalculer.

### Journée 12 de la poule, et le barème officiel enfin connu (04/09/2026)

Jérôme fournit deux captures de la fédération : les résultats **et le classement** à l'issue de la J12.

**Résultats J12 insérés** (29/08) : Lasauvage 39‑24 Belvaux · **Carreau Mondorf 44‑19 Schieren** · Steinheim 51‑12 KaBoule · exempt : A Rifat Steinfort. Mêmes garde-fous que pour la J11 — concordance avec notre feuille de match, et couverture exacte des sept clubs.

**Le barème de classement est déductible du document officiel** : 2 points par victoire, 1 par défaite. Vérifié sur les sept clubs, il tombe juste à chaque fois (KaBoule 8 v. + 3 d. = 19 ; Mondorf 8 v. + 2 d. = 18 ; Steinheim 4 v. + 7 d. = 15…). Départage ensuite à la différence de points.

`getClassementDivisionD2()` triait jusqu'ici sur le seul nombre de victoires — l'approximation était assumée dans son commentaire, héritée de `DivisionD2Backend.gs`. **Elle donnait un ordre différent de l'officiel** : à 8 victoires chacun, l'ancien tri plaçait Mondorf premier grâce à sa meilleure différence, alors que la fédération place KaBoule devant, ses 11 journées lui ayant rapporté un point de défaite de plus.

C'est le piège du barème : **une défaite rapporte un point**, donc jouer plus rapporte plus, à égalité de victoires.

Le nombre de points devient une **donnée affichée** dans `ClassementBars`, pas seulement un critère de tri — sans lui, un club devançant un autre avec une moins bonne différence reste illisible. Cohérent avec le principe déjà inscrit dans ce composant : un tooltip ne doit jamais être le seul moyen de lire une valeur.

**Vérifié** : le classement calculé est désormais identique à l'officiel, rang par rang, sur toutes les colonnes — rencontres jouées, gagnées, points faits, rendus, points de classement. Et recoupement croisé qui vaut confirmation : la somme de nos scores de rencontre fait **388**, exactement le « Points + » publié par la fédération pour Carreau Mondorf.

À surveiller : si la fédération départageait un jour deux clubs autrement qu'à la différence de points, il faudrait revoir le tri secondaire. Les quatre clubs à 14 points de la J12 sont bien ordonnés par différence décroissante, ce qui le confirme pour l'instant.

## Session du 09/09/2026 — journée 13, et Carreau Mondorf prend la tête

### A Rifat Steinfort 16 – Carreau Mondorf 47 (05/09), et la 1re place

Saisie depuis la feuille de match, et poule complétée depuis le tableau officiel FLBP fourni par Jérôme (résultats + classement à l'issue de la J13).

Poule J13 (05/09) : Steinheim 37‑26 Lasauvage · Schieren 36‑27 Belvaux · **Steinfort 16‑47 Carreau Mondorf** · exempt : KaBoule.

**Classement : Carreau Mondorf 1er** (11 j., 9 v., 435/258, 20 pts), devant KaBoule (11 j., 8 v., 19 pts) qui était exempté. Le barème déduit à la J12 — 2 points par victoire, 1 par défaite — se vérifie une nouvelle fois sur les sept clubs.

### ⚠️ La feuille de match ne nomme pas les joueurs de la même façon selon le camp

Piège nouveau, à connaître pour toutes les saisies à venir. Aux journées précédentes, Mondorf était **club A** et la feuille donnait les **prénoms** (`marlyse`, `yann B`, `christophe`…). Ici Mondorf est **club B** (déplacement) et la même feuille donne les **noms de famille** (`schmit m`, `back y`, `bertemes m`…).

**Il faut donc regarder de quel côté on est avant de rapprocher les noms.** Les initiales accolées lèvent les ambiguïtés du registre, et il y en avait quatre :

| Feuille | Registre | Retenu |
|---|---|---|
| `schmit m` | Jim, Marie-Louise, Roland | SCHMIT Marie-Louise |
| `back y` | Yves, Jérémy, Sandrine | **BACK Yves** |
| `bertemes m` | Marco, Nora | BERTEMES Marco |
| `le berre Y` | Evan, Yann | LE BERRE Yann |

**BACK Yves fait sa première apparition en D2 cette saison** — l'effectif passe à 18 joueurs.

Détail conservé tel quel plutôt que tranché : la feuille porte « lalli nello » en 2ᵉ position d'une triplette adverse de la partie 4, vraisemblablement une correction manuscrite. Enregistré `lalli/nello`.

### Vérifications

- Les quatre sous-totaux de la feuille se recalculent depuis les parties : 8‑10, 15‑0, 9‑6, 15‑0, total 47‑16. Le script refusait d'écrire sinon.
- Classement calculé **identique à l'officiel, rang par rang**, sur toutes les colonnes.
- Statistiques joueurs : 18 joueurs, **396 couples joueur×partie** (11 journées × 9 joueurs × 4), chaque joueur à `journées × 4`, et les onze scores de rencontre se reconstituent exactement depuis les points individuels.
- Recoupement croisé : la somme de nos scores fait **435**, exactement le « Points + » publié par la fédération.

### Reste ouvert

La **J14** (KaBoule à domicile, 19/09) clôt la saison. Elle décidera du titre : Mondorf mène d'un point avec le même nombre de rencontres jouées, et reçoit précisément son poursuivant.

## Session du 21/09/2026 — journée 14 : **Carreau Mondorf champion de National D2 2026**

### Carreau Mondorf 37 – 26 KaBoule (19/09)

Dernière journée de la saison, à domicile, contre le poursuivant direct. Saisie depuis la feuille de match.

Sous-totaux : tête à tête **12‑6**, triplettes **0‑15**, doublettes + 1 tête à tête **15‑0**, triplettes **10‑5**.

Les neuf alignés : SCHMIT Marie-Louise, COLPIN Christophe, GARIDEL Serge, HONGROIS Julien, LE BERRE Yann, MARTINS José Antonio, OCHEM Eric, ROUSSET Dominique, TIHY Cyrille. Effectif de la saison inchangé à **18 joueurs**.

**Classement final : Carreau Mondorf 1er** — 12 rencontres, 10 victoires, 2 défaites, 472/284 (+188), **22 points**. KaBoule 2e avec 20.

### ⚠️ Correction de la règle notée à la J13 sur le nommage des joueurs

La J13 concluait : « club A → prénoms, club B → noms de famille ». **C'est faux.** Ici Mondorf est club A (réception) et la feuille donne quand même les noms de famille (`Schmit M`, `Colpin C`, `Garidel S`…).

**La bonne règle : lire la colonne, ne jamais déduire du camp.** Le libellé de l'en-tête est « nom prénom » dans les deux cas ; c'est le rédacteur de la feuille qui choisit, journée par journée.

Deux relevés conservés tels quels plutôt que corrigés :

- `Martins T` en partie 1, `martins A` dans les trois autres. Le registre ne contient **qu'un seul** MARTINS (José Antonio) — enregistré comme tel, le `T` est un lapsus d'écriture.
- Côté KaBoule, `duchem P` (parties 1 et 2) et `juchem P` (parties 3 et 4), très probablement la même personne. On n'a pas réécrit la source.

### La table de poule est incomplète, volontairement

**La FLBP n'avait pas publié la J14 au 21/09** — le dernier tableau en ligne s'arrête à la J13. Une seule ligne de poule a donc été insérée, celle dont on a la preuve directe : `DIVD2-FEUILLE-2026-J14-CM`, Carreau Mondorf 37‑26 KaBoule, **source = notre feuille de match, pas la fédération**. Le préfixe diffère à dessein des `DIVD2-FLBP-2026-J*` pour que la provenance reste lisible.

Conséquence visible à l'écran : Mondorf et KaBoule affichent 12 rencontres, les cinq autres clubs encore 11. C'est exact, pas un bug.

Les affiches manquantes sont connues sans être chiffrées — **la poule à 7 rejoue les mêmes affiches à 7 journées d'écart, terrains inversés**. Le miroir de la J7 donne pour la J14 : Lasauvage–Schieren, Belvaux–Steinfort, **Mondorf–KaBoule** et exempt Stenemer Bulls Steinheim. La seule affiche vérifiable confirme le miroir (J7 : KaBoule‑Mondorf ; J14 : Mondorf‑KaBoule).

⚠️ **Le format de publication de la FLBP a changé** : ce n'est plus un PDF mais un PNG (`.../2026/09/Resultats-J-13.png`, avec un `Classement-J-13.png` séparé). Le chemin `Resultats-J-11.pdf` noté en août ne vaut plus.

### Le titre ne dépend pas des deux résultats manquants

Vérifié en poussant les deux rencontres non publiées à leurs issues extrêmes (63‑0 dans un sens, puis dans l'autre) : dans les deux cas Mondorf finit **1er à 22 points**, KaBoule 2e à 20, et le mieux qu'un autre club puisse atteindre est 18. Aucun club n'a de rencontre en retard. **Le titre est acquis arithmétiquement.**

### Vérifications

- Les quatre sous-totaux de la feuille se recalculent depuis les parties : 12‑6, 0‑15, 15‑0, 10‑5, total 37‑26. Le script refusait d'écrire sinon, et refusait aussi si un joueur n'apparaissait pas exactement une fois par phase.
- Statistiques joueurs : 18 joueurs, **432 couples joueur×partie** (12 rencontres × 9 joueurs × 4), chaque joueur à `journées × 4`, aucune double présence dans une même phase.
- Les **douze** scores de rencontre se reconstituent exactement depuis les points individuels.
- Somme de nos scores sur la saison : **472**. À recouper avec le « Points + » de la fédération quand elle publiera la J14 — c'est ce recoupement qui a validé les J11 à J13.

### Reste ouvert

Insérer les **trois lignes de poule manquantes de la J14** dès publication FLBP (Lasauvage–Schieren, Belvaux–Steinfort, exempt Steinheim), sous le préfixe `DIVD2-FLBP-2026-J14-*`, et en profiter pour recouper notre 37‑26 avec le tableau officiel.

## Session du 21/09/2026 — avertissement React « unique key » sur /national-d2

### Le symptôme

En développement, la console de `/national-d2` affichait :

> Each child in a list should have a unique "key" prop. Check the render method of `SectionToggle`. It was passed a child from NationalD2Page.

Particularité qui a orienté le diagnostic : **rien au chargement de la page**, l'avertissement n'apparaissait qu'au **premier changement d'onglet**.

### La cause n'est pas celle qu'on suppose

`SectionToggle` ne construit aucun tableau : il reçoit `calendrier`, `statistiques` et `propositionIA` en props et n'en affiche qu'un à la fois. Le « tableau » incriminé est simplement la liste des enfants de son `<div>`, produite par JSX.

Normalement React valide ces enfants statiques au moment de créer l'élément parent (`validateChildKeys`) et ne réclame donc pas de `key`. Sauf que ces trois sections sont rendues **côté Server Component** et traversent la charge RSC : elles arrivent au client sous forme de `lazy` **pas encore initialisés**. Relevé sur la fibre en direct, dans le navigateur :

| prop | forme reçue côté client | `_store.validated` |
|---|---|---|
| `calendrier` | élément React | 1 |
| `statistiques` | `lazy` (`fulfilled`) | 1 |
| `propositionIA` | `lazy` (`resolved_model`) | **0** |

`validateChildKeys` ne sait pas regarder à l'intérieur d'un `lazy` non résolu : il marque l'enveloppe, pas l'élément enveloppé. Le réconciliateur, lui, initialise le `lazy`, tombe sur un élément `validated: 0` sans `key`, et avertit. `calendrier` y échappe parce qu'il est déjà un élément simple au montage — d'où le silence au chargement et l'avertissement au premier basculement.

### Le correctif

Une `key` explicite par section, égale à l'identifiant de l'onglet, portée par un `Fragment` (aucun nœud DOM ajouté, rendu inchangé) — `src/components/SectionToggle.tsx`. La condition d'avertissement de React (`!validated && key == null`) ne se vérifie plus.

⚠️ **Ne pas « nettoyer » ces `Fragment`** en les jugeant superflus : ils ne servent qu'à porter la clé, et les retirer ramène l'avertissement. Un commentaire le rappelle dans le fichier.

**Le piège vaut pour tout composant client qui reçoit des sections rendues côté serveur et les place dans une liste d'enfants**, pas seulement pour `SectionToggle`.

### Vérification

Console vide, sur un onglet neuf, après un cycle complet Calendrier → Statistiques → Proposition IA → Calendrier (les deux panneaux réservés se montent bien : ils affichent leur message de restriction, l'essai n'est donc pas à vide). `npx tsc --noEmit` et `npm run build` passent. `npm run lint` rend exactement les mêmes 18 remontées qu'avant le correctif — toutes préexistantes, aucune sur `SectionToggle.tsx`.
## Session du 21/09/2026 (suite) — tableau de bord individuel du licencié, et un rapprochement de noms qui ne rapprochait rien

### 🔴 Le bug qui conditionnait tout : `mes_parties_d2()` ne renvoyait jamais rien

Avant d'écrire la moindre ligne d'interface, l'analyse a buté sur ceci : la RPC `mes_parties_d2()` (migration 0022) comparait le nom de la session à chaque joueur d'une partie **par égalité exacte**, alors que les deux côtés n'écrivent pas le nom dans le même ordre.

| Source | Format | Exemple |
|---|---|---|
| `mon_nom_benevole()` → `prenom \|\| ' ' \|\| nom` | **Prénom NOM** | `Marie-Louise SCHMIT` |
| `parties_d2.joueurs_cm` | **NOM Prénom** | `SCHMIT Marie-Louise` |

Mesuré sur la base : **0 des 18 joueurs D2 correspondait au format testé, les 18 correspondaient au format inverse.** La carte « Compétition » de `/moncaro` affichait donc « aucune partie cette saison » à tous les licenciés, y compris aux dix joueurs du titre. Le même défaut frappait la carte Promotion, où `promotion_equipes.joueur_*` écrit également le nom de famille en premier.

**Correctif (migration 0061)** : une fonction `cle_nom_joueur()` qui compare l'**ensemble des mots, trié**, sans accents ni ponctuation. Pas de découpage prénom/nom — aucune heuristique ne survit à « José Antonio MARTINS » ni à « Yann LE BERRE ». Jumelle TypeScript exacte : `cleNomJoueur()` dans `normalisationTexte.ts`, **à maintenir en phase avec la fonction SQL**.

Après correctif : **18 joueurs sur 18 retrouvés**, avec des totaux identiques à ceux de la vue collective `/national-d2`.

⚠️ Effet de bord révélateur : la clé a mis au jour **deux fiches pour la même personne** dans `personnes` (Gaia / Gaïa BENNONI, la seconde sans e-mail ni adhésion). Ce n'est pas la clé qui se trompe — c'est le registre. Traité à part.

### Ce que le tableau de bord montre, et ce qu'il refuse de montrer

Principe tenu partout : **aucun indicateur inventé**. Ce qui n'est pas calculable vaut `null` et disparaît de l'écran, au lieu de s'afficher à zéro — « aucune donnée » et « zéro victoire » ne disent pas la même chose au licencié qui se relit.

Quatre onglets (`Tabs`) : *Ma saison*, *Championnat*, *Promotion*, *Ma vie de club*. Un membre non-licencié ne voit que le dernier.

**Trois arbitrages de données, assumés :**

1. **Les convocations n'existent pas** — aucune table, nulle part. Plutôt que de créer une table que personne n'alimenterait, l'indicateur de participation est **« présence en équipe » = journées jouées / rencontres disputées par l'équipe** (RPC `rencontres_jouees_saison`, hors journées d'exemption). C'est exact, c'est honnête, et ça ne promet pas un taux de présence qu'on ne sait pas calculer.
2. **La Promotion 2026 n'a pas de résultats** — `promotion_equipes` s'arrête à 2025, alors que 84 sorties 2026 sont déclarées dans `participations_concours`. L'onglet montre donc les sorties réelles et dit franchement que les résultats ne sont pas saisis.
3. **Pas de comparaison N‑1** — il n'existe aucune donnée individuelle 2025 (ni `rencontres_d2`, ni `parties_d2`, ni `adhesions`). Promettre une progression aurait été un mensonge d'interface.

**Distinctions** : trois au maximum, chacune la lecture littérale d'un chiffre, avec des seuils exigeants (série ≥ 4 ; taux ≥ 70 % **et** au moins 8 parties — un 100 % sur deux parties ne dit rien). Elles disparaissent dès que le chiffre ne les porte plus.

### Choix de conception

- **Aucune librairie de graphiques ajoutée.** Les primitives SVG maison de `StatsCharts.tsx` (`BarreProportion`, `GraphiquePointsParJournee`, `IconeTypePartie`) couvraient le besoin ; seul l'anneau victoires/défaites a été écrit, en SVG également.
- **Jamais de rouge sur un résultat sportif.** Une défaite n'est pas une alerte système. Deux teintes seulement : `pin` pour les victoires, `ligne` pour le reste.
- **L'information ne repose jamais sur la seule couleur** : chaque partie porte son score, et un libellé « gagnée »/« perdue » lu par les lecteurs d'écran à toutes les largeurs. Le graphique de points est doublé d'un tableau `sr-only`.
- **`Tabs` défile horizontalement** au lieu de passer à la ligne : à 375 px, quatre onglets font 488 px et les libellés se coupaient en deux. Correction portée sur le composant partagé, donc profitable à `/promotion` aussi.
- **Ni cache ni pré-calcul** : 240 parties et 149 affectations en base, l'agrégation en mémoire est immédiate. Les sept appels de la page sont en revanche regroupés en un seul `Promise.all`, chacun gardant son `.catch()` pour qu'une RPC absente dégrade une carte et non la page.

### Vérifications

- **Couche données** : les 18 joueurs de 2026 recalculés par SQL en rejouant `cle_nom_joueur`, puis passés dans `construireBilanSportifD2()`. **Aucune anomalie** — V+D = joués, parties = journées × 4, jamais plus de journées que de rencontres, camp connu partout.
- **Cas limites couverts par des joueurs réels** : 48 parties sur 12 journées (ROUSSET, 100 % de présence), 4 parties sur 1 journée (BACK, DUBLIN, MARION, PRYBYLA, SALVAN), aucune partie (tout non-joueur), aucun résultat Promotion (2026), saison entièrement vide (2025).
- **Rendu** contrôlé au navigateur sur une page d'aperçu temporaire alimentée en données réelles, **supprimée avant le commit** : en-tête, bandeau, quatre onglets, états vides, et mobile à 375 px sans débordement horizontal. Console sans erreur.
- `npx tsc --noEmit` propre, `npm run build` réussi, `npm run lint` inchangé (18 problèmes, tous antérieurs, aucun dans les fichiers touchés).

### ⚠️ Non vérifié, et pourquoi

**Le rendu connecté n'a pas été testé avec une vraie session.** L'authentification passe par un lien magique reçu par e-mail : ouvrir une session aurait voulu dire se connecter à la place d'un membre, ce qui n'a pas été fait. La couche données est vérifiée exhaustivement par SQL, et l'interface avec ces mêmes données réelles, mais **le parcours connecté de bout en bout reste à valider par Jérôme** (instructions dans la PR).

### Reste ouvert

- Fusionner la fiche en double de Gaïa BENNONI dans `personnes`.
- Si le club veut un vrai taux de présence : table `convocations_d2 (rencontre_id, personne_id, statut, repondu_le)`, alimentée par le capitaine avant chaque rencontre. Rien n'a été créé tant que personne ne l'alimente.
- `affectations` désigne le bénévole par un **nom en texte libre**, sans `personne_id` : le rattachement reste un `ilike` sur le nom.
## Session du 21/09/2026 (suite) — la fiche en double de `personnes`

Mise au jour par la clé de rapprochement `cle_nom_joueur()` introduite pour le tableau de bord individuel : le registre portait **deux fiches pour la même personne**.

| | |
|---|---|
| **id 5** (`P-5`) | BENNONI « Gaia » — fiche complète : naissance, nationalité, adresse, téléphone, e-mail, droit à l'image, **et une adhésion 2026 « Licencié »** |
| **id 68** (`P-68`) | BENNONI « Gaïa » — **le nom seul**, aucune autre colonne, aucune adhésion |

**Ce n'était pas la clé qui se trompait, c'était le registre** — et c'est exactement ce qu'on attend d'elle : reconnaître comme une seule personne deux écritures d'un même nom.

### Vérifications avant écriture

- Les **sept clés étrangères** pointant vers `personnes` (`adhesions`, `appels_paiement`, `demandes_adhesion`, `participations_concours` ×2, `tournoi_participants`, `declarations_vocales_clarification`) : **aucune ligne** pour l'id 68.
- Balayage des **146 colonnes texte** de la base : « Gaïa BENNONI » n'apparaît nulle part ailleurs. Ni dans `affectations.nom` — qui désigne pourtant les bénévoles par un nom libre, donc le seul endroit où un doublon aurait pu se cacher hors clé étrangère — ni dans `acces`, qui ne porte que « Gaia BENNONI » rattachée à son e-mail, donc à l'id 5.

### Ce qui a été fait (migration 0063)

Suppression **douce** (`supprime = true`) de l'id 68, jamais de `DELETE` : convention du projet sur toute donnée de registre, et trace réversible qu'exige une donnée RGPD. Une note explicative est écrite sur la fiche archivée. La migration porte cinq garde-fous (`prenom`/`nom` attendus, colonnes vides, aucun rattachement) : si quoi que ce soit avait été ajouté à cette fiche entre-temps, elle n'aurait rien fait.

**Après** : plus aucune collision de clé dans le registre actif (124 personnes), et `gbennoni@gmail.com` résout toujours vers la seule fiche id 5, en lecture directe comme via `licencies_saison()`.

### ⚠️ Laissé en l'état, délibérément

**L'orthographe du prénom n'a pas été touchée.** Laquelle des deux graphies est la bonne — « Gaia » ou « Gaïa » — n'est pas déterminable depuis la base : la fiche vide n'est pas une preuve. L'existence même du doublon suggère que quelqu'un a un jour voulu corriger la graphie et a créé une ligne au lieu d'en modifier une, mais ce n'est qu'une hypothèse. À trancher avec la personne concernée, pas par déduction.

## Session du 21/09/2026 (suite) — le tableau de bord d'un membre, vu par le comité

Demande de Jérôme, née d'une contrainte concrète : son propre compte **n'a aucune partie de D2**, il ne pouvait donc pas voir à quoi ressemble un tableau de bord rempli sans demander à un joueur de se connecter.

Nouvelle route **`/membres/[id]/tableau-de-bord`**, accessible par un bouton depuis la fiche membre. Mêmes sections que `/moncaro`, avec un mode `consultation` qui bascule les libellés à la troisième personne — « Ses rencontres de National D2 », « Son engagement au club », « Sa cotisation » — et affiche le nom complet au lieu de saluer.

### Ce que ça n'ouvre pas

**Aucun accès nouveau.** `personnes`, `adhesions` et `parties_d2` sont déjà lisibles par le CA, et les statistiques individuelles de **tous** les joueurs s'affichent déjà sur `/national-d2`. Cet écran ne fait que les remettre dans la forme que voit le licencié.

⚠️ **Une exception, et elle est volontaire.** La RLS de `participations_concours` (migration 0047) réserve la lecture à la **trésorerie**, pas à l'ensemble du comité : les montants de remboursement ne regardent pas tout le CA. La carte « Concours » disparaît donc pour un membre du CA hors trésorerie, et un bandeau le dit en haut de page. **Choix assumé : on n'a pas élargi la policy pour faire tenir la maquette.**

Le bouton de paiement de la cotisation est masqué en mode consultation : le QR SEPA règle la cotisation de celui qui le scanne, il n'a aucun sens pour qui consulte.

### Implémentation

- `getStatistiquesD2PourJoueur()` (stats.ts) — jumelle de `getMesStatistiquesD2()` pour un nom explicite, par lecture directe de `parties_d2`. La réduction commune est sortie dans `assemblerBilanJoueur()`, les deux chemins la partagent.
- `getTableauDeBordBenevolePourNom()` (benevolat.ts) — même extraction, `getMonTableauDeBordBenevole()` n'en est plus qu'un appel dérivé de la session.
- `getTableauDeBordMembre()` (tableauDeBordMembre.ts) — assemble le tout. **Ne contrôle rien elle-même**, et son en-tête le dit : la garde `estMembreCA()` est posée par la page, la RLS tranche le reste.
- Les participations concours sont lues **sans condition** : c'est la RLS qui décide, et `concoursVisible` fait ensuite disparaître la carte. « Pas le droit d'en voir » et « rien à voir » ne doivent pas se ressembler à l'écran.

### Vérifications

- Mode consultation contrôlé au navigateur : en-tête au nom complet, onglets sans « Ma », « Ses partenaires de jeu », « Son engagement au club », « Sa cotisation », bouton Payer absent.
- **Garde d'accès** : `/membres/5/tableau-de-bord` hors session renvoie « Accès restreint », et aucun nom de membre ne fuit dans le HTML.
- `tsc --noEmit` propre, `npm run build` réussi, lint inchangé (18 problèmes, tous antérieurs).

### Reste à faire

Le **test connecté** reste entier, ici comme pour `/moncaro` : je ne me connecte pas à la place d'un membre. Jérôme est administrateur, il peut désormais ouvrir la fiche de n'importe quel joueur et voir son tableau de bord — c'est précisément ce que cette route rend possible.
## Session du 22/09/2026 — le graphique des points recouvrait la liste des parties

Signalé par Jérôme sur `/national-d2` → *Statistiques individuelles*, panneau déplié de Dominique ROUSSET : la colonne « Toutes les parties » passait par-dessus les dernières barres du graphique. Son intuition était juste — **ça ne touche que les joueurs ayant beaucoup de journées**.

### Cause

`GraphiquePointsParJournee` a une **largeur intrinsèque fixe** : `n × 22 px + (n−1) × 8 px`.

| Journées | Largeur | Colonne disponible |
|---|---|---|
| 8 | 232 px | ~296 px ✓ |
| 10 | 292 px | ~296 px ✓ (à la limite) |
| **12** | **352 px** | ~296 px ✗ |
| **14** | **412 px** | ~296 px ✗ |

Au-delà d'une dizaine de journées, le graphique dépassait sa cellule. Et comme la troisième colonne est peinte après, c'est elle qui recouvrait le graphique — d'où l'impression que la liste « passait dessus ».

Deux ingrédients, pas un seul : la largeur fixe, **et** le fait qu'un enfant de grille CSS a `min-width: auto` par défaut, donc refuse de rétrécir sous la largeur de son contenu.

### Correction

- Le graphique est enveloppé dans un conteneur `overflow-x-auto` : **il défile au lieu de déborder**. Les barres gardent leur largeur fixe — les rétrécir pour faire tenir quatorze journées les rendrait illisibles.
- `[&>*]:min-w-0` sur les grilles qui l'accueillent, sans quoi la cellule ne peut pas rétrécir et c'est toute la grille qui déborde.

Corrigé **à la source**, donc les trois usages en bénéficient : le panneau déplié et la fiche joueur de `/national-d2`, et la carte « Points par journée » de `/moncaro`, qui courait le même risque.

### Vérifications

Structure du panneau reproduite à l'identique et mesurée pour 8, 10, 12 et 14 journées :

- **aucun débordement sur la colonne voisine** dans les quatre cas ;
- défilement déclenché à partir de 12 journées seulement, apparence inchangée en dessous ;
- ni la grille ni la page ne débordent ;
- colonne unique (mobile) contrôlée à l'écran : graphique défilant, liste en dessous intacte.

`tsc --noEmit` propre, lint inchangé (18 problèmes, tous antérieurs).

## Session du 22/09/2026 — 🔴 le tableau de bord affichait le bilan d'un coéquipier

Signalé par Jérôme sur la fiche de Dominique ROUSSET : **4 parties, 100 %, 2 journées** au lieu de 48 parties, 65 %, 12 journées.

Ce n'était pas un défaut d'affichage. **C'étaient les statistiques de quelqu'un d'autre, sous son nom** — celles de Marco BERTEMES (4 parties, 4 victoires, 18 points, 2 journées), au chiffre près.

### Cause

`assemblerBilanJoueur()` prenait **`joueurs[0]`**, en s'appuyant sur ce raisonnement, écrit en commentaire depuis juillet :

> « la RPC ne renvoie déjà que les lignes où le nom de la session apparaît, donc `reduireStatistiquesD2` produira au plus une entrée dans `joueurs` »

**Ce raisonnement est faux.** Les lignes ne concernent bien que le joueur visé, mais chacune cite **aussi ses partenaires** de doublette et de triplette. Le regroupement produit donc une entrée par joueur cité — onze dans le cas de ROUSSET — et la liste est triée par **taux de victoire décroissant**. `joueurs[0]` renvoyait donc le partenaire au meilleur pourcentage, jamais le joueur demandé sauf coïncidence.

### Correction

Le bilan est **cherché par sa clé**, plus jamais pris par position. `getMesStatistiquesD2()` résout désormais `mon_nom_benevole()` pour savoir qui chercher ; `getStatistiquesD2PourJoueur()` a déjà le nom. **Aucun repli sur un autre joueur** : si le nom demandé n'apparaît pas, le bilan est vide, ce qui est la seule réponse juste.

### Portée

Le défaut touchait **`/moncaro` depuis sa mise en ligne** : chaque licencié pouvait lire le bilan partiel d'un coéquipier présenté comme le sien. Et la vue comité depuis la veille.

### ⚠️ Pourquoi ma vérification ne l'avait pas vu

Ma page d'aperçu construisait l'objet de statistiques **à la main** avant de le passer aux composants. Elle a donc validé le rendu, la mise en page et les états vides — mais **jamais la sélection du joueur**, qui est précisément là où était le bug. Un aperçu qui contourne la couche qu'il est censé éprouver ne prouve rien sur elle.

**Leçon à retenir pour les prochaines vérifications : passer par le vrai chemin de code, même quand il est plus pénible à instrumenter.**

### Vérification refaite, correctement

Les 18 joueurs de la saison passés par `getStatistiquesD2PourJoueur()` puis `construireBilanSportifD2()` — le chemin exact de la page — et comparés à une vérité recalculée séparément depuis les lignes brutes : **aucun écart**. ROUSSET rend bien 48 parties, 31 victoires, 112 points.

⚠️ `/moncaro` emprunte l'autre chemin (la RPC, avec session) : la logique de sélection est la même et se trouve dans la fonction partagée, mais **le parcours connecté reste à confirmer par Jérôme**.

### Reste ouvert

Le projet n'a **aucun harnais de test**. Ce défaut aurait été attrapé par trois lignes d'assertion. À considérer si d'autres calculs de ce genre s'ajoutent.

## Session du 22/09/2026 (suite) — consulter sans passer par le formulaire de modification

Retour de Jérôme : le tableau de bord d'un membre n'était atteignable que depuis sa fiche, c'est-à-dire **depuis un écran d'édition**. Consulter obligeait à ouvrir un formulaire de modification — mauvaise porte d'entrée, et risque d'édition involontaire.

Chaque ligne du registre `/membres` porte désormais **deux icônes** : un tableau de bord pour consulter, un crayon pour modifier. La consultation est ainsi au même niveau que l'édition, et non derrière elle. Les deux portent un `title` et un `aria-label`.

Vérifié : les deux liens sont bien générés par ligne avec le bon identifiant, sans erreur de console.

### Piste écartée pour l'instant, et pourquoi

Le second endroit naturel serait la liste des joueurs de `/national-d2` → *Statistiques individuelles*. Deux obstacles, dont un de fond :

- Cette liste est ouverte à la **commission sportive** (`est_membre_commission_sportive()`), qui est **plus large que le CA**, alors que `/membres/[id]/tableau-de-bord` est réservé au CA. Un lien y mènerait donc certains utilisateurs droit vers « Accès restreint ». Il faudrait soit conditionner le lien à `est_membre_ca()`, soit ouvrir la route à la commission sportive — mais le tableau de bord contient l'adhésion, les paiements et le bénévolat, bien au-delà du sportif. **Élargir serait exposer plus que des statistiques : à trancher par Jérôme, pas par défaut.**
- La liste regroupe par **nom** (depuis `parties_d2`), pas par `personne_id` : il faudrait résoudre nom → identifiant via `licencies_saison()`.
## Session du 22/09/2026 (suite) — le lien depuis le classement individuel, conditionné au CA

Arbitrage rendu par Jérôme sur la question laissée ouverte : **conditionner le lien**, plutôt qu'élargir la route.

Le bas du panneau déplié d'un joueur, sur `/national-d2` → *Statistiques individuelles*, porte désormais « Voir le tableau de bord de X ».

### Deux conditions, pas une

1. **`est_membre_ca()`**, et non l'accès qui ouvre l'écran. Ce classement est visible par la **commission sportive** (migration 0044), plus large que le comité, alors que `/membres/[id]/tableau-de-bord` est réservé au CA. Sans cette distinction, un membre de la commission aurait cliqué vers « Accès restreint ». **La route n'a pas été élargie** : le tableau de bord contient l'adhésion, les paiements et le bénévolat, bien au-delà du sportif.
2. **La fiche du joueur doit être retrouvée.** Le classement regroupe par nom (depuis `parties_d2`), pas par identifiant : la résolution passe par `licencies_saison()` (qui n'expose qu'id, nom, prénom) et la clé insensible à l'ordre des mots. Joueur non retrouvé, pas de lien — plutôt qu'un lien cassé.

Le lien est placé **dans le panneau déplié et non sur la ligne** : celle-ci est un `<button>` qui ouvre le détail, et un `<a>` ne peut pas y être imbriqué.

### Vérifications

- **18 joueurs du classement sur 18** résolvent vers leur fiche. La clé distingue correctement **Yann de Evan LE BERRE** et **Julien de Hugo HONGROIS**, deux paires présentes au registre dont un seul membre joue en D2.
- Hors session : **aucun lien, aucun nom de joueur dans le HTML**, message « réservé aux licenciés ».
- `tsc --noEmit` propre, lint inchangé (18 problèmes, tous antérieurs).

## Session du 22/09/2026 (suite) — audit de confidentialité, et trois défauts corrigés

Demande de Jérôme : « toute information associée à une personne n'est-elle vue que par cette personne ou par les rôles autorisés ? **Vérifie précisément cela.** »

Audit mené **par l'expérience** et non par relecture : sondage de toutes les tables et de toutes les RPC **avec la clé anonyme**, plus lecture des policies et des droits réels en base.

### 🔴 1. La liste nominative des licenciés était lisible sans connexion

`licencies_saison('2026')`, appelée avec la clé anonyme — celle qui est publiée dans le navigateur — renvoyait **les 62 licenciés avec id, nom et prénom**. L'annuaire du club, accessible à quiconque.

⚠️ **PIÈGE SUPABASE, à retenir pour toute fonction future.** La migration 0050 écrivait pourtant la bonne intention :

```sql
revoke all on function ... from public;
grant execute on function ... to authenticated;
```

Mais Supabase accorde `EXECUTE` au rôle `anon` par **privilège par défaut**, et `revoke ... from public` **ne retire pas** un droit accordé nommément à `anon` :

```
{postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}
                      ^^^^^^^^^^^^^^^
```

**Il faut révoquer `anon` explicitement.** Les 27 autres fonctions `security definer` portent le même défaut de droits, mais **aucune ne fuit** : toutes dérivent l'identité de `auth.jwt()->>'email'` et ne renvoient rien à un anonyme — vérifié en les appelant une à une. `licencies_saison` était la seule à prendre un paramètre sans vérifier qui appelle.

### 🟠 2. Des noms de joueurs adverses en lecture publique

`rencontres_d2` est publique à dessein (les scores), mais sa colonne `notes` portait, pour les journées 12 à 14, **la composition des équipes adverses** — des joueurs d'autres clubs, sans lien avec cette application. Écrites par Claude lors des saisies.

La provenance est conservée, les noms partent. Le détail reste dans `parties_d2.joueurs_adverse`, réservée au CA, où il a sa place.

### 🔴 3. `mes_participations_concours` échouait pour tous les appelants

```
column reference "id" is ambiguous
select id into mon_id from public.personnes
```

Conflit entre le `id` du select et la colonne `id` du `returns table`. **La fonction plantait à chaque appel**, et `/moncaro` avalait l'erreur : la carte « Concours et remboursements » affichait « Aucune participation déclarée » à tout le monde. Même motif que les deux bugs de la veille — une réponse plausible et fausse. Corrigé en qualifiant `p.id`.

### Ce qui était déjà correct

- **RLS activée sur les 35 tables**, aucune sans protection.
- Sondage anonyme : `personnes`, `adhesions`, `acces`, `parties_d2`, `participations_concours`, `affectations`, `conges`, `demandes_adhesion`, `appels_paiement`, `notes_vocales`, `journal_modifications`, tournois → **0 ligne**.
- Cloisonnement par rôle exact : registre et parties → CA · remboursements → **trésorerie seule** · classement complet → commission sportive · bénévolat → licenciés.
- `participations_concours` : `est_membre_tresorerie() OR personne_id = moi OR chef_equipe_id = moi`.
- **23 des 28** fonctions `security definer` portent une garde interne ; toutes les fonctions d'écriture sont gardées ; les deux sans garde (`montants_club`, jeton de clarification) le sont par conception.

### Après correctifs, revérifié

Tables personnelles lisibles en anonyme : **0**. RPC renvoyant des données personnelles en anonyme : **aucune**. `licencies_saison` répond `permission denied`, et les cinq appelants — tous porteurs d'une session — gardent leur accès via `authenticated`.

### ⚠️ La limite de cet audit

**Le point de vue d'un licencié connecté non-CA n'a pas été éprouvé.** Ouvrir une session à la place d'un membre n'a pas été fait. Ce volet est établi par lecture des policies et par sondage anonyme, pas par l'expérience — c'est le seul angle mort, et il mériterait un test réel un jour.

## Session du 23/09/2026 — Promotion 2026 : ce que la fédération a publié, et ce qu'on peut en tirer

### Point de départ

Jérôme demande si la FLBP a publié la **J14 de National D2**. Réponse : **non**. Vérifié sur la page elle-même (section *Résultats → Championnat National & Promotion*, dont le `src` d'image pointe toujours sur `Resultats-J-13.png`), pas seulement en devinant l'URL J14. La page des nouvelles s'arrête au 15/09. Les trois lignes de poule manquantes restent en attente.

⚠️ **Le site FLBP a été refondu depuis août.** Les résultats sont désormais chargés dans un panneau dépliant. Deviner une URL de fichier y est encore moins fiable qu'avant.

Au passage, un tableau **Promotion** était en ligne. Jérôme : « dépouille les résultats Promotion ».

### Méthode d'inventaire à réutiliser : la médiathèque WordPress

```
https://flbp.lu/wp-json/wp/v2/media?search=PROMO&per_page=50&_fields=source_url,date,title
```

Elle liste **tous** les fichiers déposés, datés, sans deviner aucun nom. Un sondage d'URL par force brute (10 numéros × 6 mois × 2 suffixes), mené en parallèle, a trouvé exactement la même chose — la médiathèque fait foi, en une requête. **À utiliser en premier pour toute question « la fédération a-t-elle publié X ? »**, D2 comprise (`search=Resultats`).

### Ce que la FLBP a publié pour la Promotion 2026

| Fichier | Déposé | Contenu |
|---|---|---|
| `PROMO-Resultats-6-scaled.png` | 27/05 | **feuille complète de la J6** (`-6-1` est un doublon, md5 identique) |
| `PROMO-Classement-6.png` | 27/05 | classement après J6 |
| `PROMO-Classement-8.png` | 21/07 | classement après J8 |
| `PROMO-rect-…-Total-journees-scaled.png` | 21/07 | **points par club et par journée**, J1 à J8 |
| `PROMO-Resultats-10-scaled.png` | 14/09 | **feuille complète de la J10** |
| `PROMO-Classement-10.png` | 14/09 | classement final, 10 journées |

**Deux feuilles de journée sur dix.** Seules elles donnent la composition des trios et les parties gagnées par équipe — ce dont `promotion_equipes` a besoin.

### Lire une feuille de journée : (adversaire, score)

Chaque ligne porte huit chiffres : quatre paires. **L'ordre n'est écrit nulle part**, et il a été établi, pas supposé :

- l'équipe 4 de la J10 lit `2,13 · 15,13 · 23,13 · 26,13` et totalise 4 victoires. En *(adversaire, score)* elle gagne quatre fois 13 ; en *(score, adversaire)* elle n'en gagnerait aucune ;
- **réciprocité** vérifiée sur trois couples : l'équipe 3 marque 13 contre la 25, la 25 marque 12 contre la 3. Idem 2↔24 et 1↔19.

`ex.` = exempt, compté 13 et gagné, comme le font les totaux du document. Barème : 5 points par partie gagnée.

### Inséré (migration 0065) : 5 équipes, J6 et J10

| J | Date | Éq. | Cat. | Trio | Gagnées |
|---|---|---|---|---|---|
| 6 | 17/05 | 40 | B/M | BERTEMES Marco · FLAMMANG Marie-Jean · BACK Yves | 2 |
| 6 | 17/05 | 41 | B/H | MARION Stéphane · STEPHAN Sylvain · PORCU Bruno | 1 |
| 10 | 06/09 | 1 | A/M | MARION Stéphane · FLAMMANG Marie-Jean · MATHIS Claude | 2 |
| 10 | 06/09 | 2 | A/M | WALTE Claude · WALTE Danielle · HEISBOURG Nico | 1 |
| 10 | 06/09 | 3 | B/H | OLINGER Claude · PORCU Bruno · STEPHAN Sylvain | 2 |

`source_id` préfixé `PROMO-FLBP-2026-J{n}-E{équipe}`. **Onze joueurs sur onze** rapprochés d'une fiche active du registre par `cle_nom_joueur`.

**Garde-fou dans la migration** : les totaux de club doivent retomber sur ceux de la fédération, sinon tout est annulé. J6 = 3 parties / 15 pts, **confirmé par deux documents indépendants** (feuille J6 et colonne 17/05 du « Total Journées »). J10 = 5 parties / 25 pts (cellule de total de la feuille).

### Le bilan de club de Carreau Mondorf, journée par journée

Reconstitué, **non inséré** — aucune table ne le porte (voir « Reste ouvert ») :

| J1 12/04 | J2 19/04 | J3 25/04 | J4 02/05 | J5 09/05 | J6 17/05 | J7 05/07 | J8 12/07 | J9 30/08 | J10 06/09 | **Total** |
|---|---|---|---|---|---|---|---|---|---|---|
| 45 | 40 | 20 | 40 | 35 | 15 | 30 | 45 | *20* | 25 | **315** |

J1 à J8 : tableau « Total Journées » — sa somme (270) est **identique** au classement officiel après J8, club par club sur les quatorze. J10 : feuille J10. **J9 déduite, pas publiée** : 315 (classement final) − 270 − 25 = 20.

**Classement final : Carreau Mondorf 8e sur 14**, 315 points, deux « 4/4 » sur la saison (aucune en J9 ni en J10 : le compteur est déjà à 2 après J8). USBP Dudelange premier avec 475.

### ⚠️ Le vrai sujet : une saison à 2 journées sur 10 se lit comme une saison entière

Vérifié en faisant tourner la vraie `getStatistiquesPromotion()` : MARION Stéphane sort à « 2 journées jouées, 38 % ». Présenté sans contexte, c'est faux par omission — il a vraisemblablement joué presque toute la saison.

Et **l'insertion change ce que voit `/moncaro`** : jusqu'ici, l'onglet Promotion de 2026 disait franchement « résultats non enregistrés ». Il afficherait désormais « 2 journées » sous le nom du licencié, à côté de ses sorties déclarées — la contradiction aurait sauté aux yeux.

Trois corrections, pour que la donnée ajoutée ne trompe personne :

1. **`getNombreJourneesPromotion(saison)`** (`src/lib/data.ts`) — le nombre réel de journées, lu dans `calendrier_federation`. Renvoie `null` si le calendrier ne couvre pas la saison : **on tait le total plutôt que de le déduire du plus grand numéro connu**, qui n'en serait qu'une borne basse.
2. **`CouvertureSaisonPromotion`** — bandeau au-dessus des deux onglets de `/promotion` : « Saison partielle — 2 journées sur 10 … ». Cite la plus courte des deux listes (journées présentes ou manquantes). Ne rend rien si la couverture est complète ou le total inconnu.
3. **`SectionPromotion`** (`/moncaro` et vue comité) — l'en-tête du bilan devient « 2 journées sur 10 », avec une phrase d'explication. Le dénominateur est posé à l'endroit exact où naît l'ambiguïté.

Vérifié en rendant les **composants réels** côté serveur (`renderToStaticMarkup`) sur les **données réelles**, pour les quatre branches : saison partielle, liste des manquantes plus courte, couverture complète, total inconnu.

### `/promotion` était figée sur 2025

`const SAISON_PROMOTION = '2025'`, commentée « seule saison disponible pour l'instant ». Sans correction, **les données 2026 seraient restées invisibles sur cette page**. Elle suit désormais la mécanique de `/national-d2` : `?saison=`, saison active par défaut, `SaisonSwitcher`. La page passe de statique à dynamique ; rien de protégé ne transite par le serveur (`PromotionContent` lit toujours côté client, avec la session du licencié).

La liste des saisons vient de `saisons` (publique) et non de `promotion_equipes` : **une lecture serveur anonyme de cette dernière reviendrait vide**, la RLS la réservant aux licenciés.

### Deux écarts relevés, non corrigés — à trancher par Jérôme

- **J5 : 09/05 dans `calendrier_federation`, 10/05 dans le tableau fédéral.** ✅ **Tranché par Jérôme le 23/09 : on retient la date du calendrier, 09/05** (migration 0067).
- **Registre : « WALTE Daniellé »** (id 116), là où la fédération écrit « Danielle ». L'accent final n'existe pas dans ce prénom, c'est très probablement une coquille. Sans effet sur les statistiques (`cleNomMajuscules` ignore les accents). Même principe qu'au 0063 pour BENNONI : on ne corrige pas le prénom de quelqu'un sans le lui demander.

### Livraison

[PR #23](https://github.com/jeromedoyen/carreau-mondorf-nextjs/pull/23) fusionnée le 23/09 (`main` = `b874c74`), branche conservée. Déploiement Vercel en `success`. Contrôle en production, sans connexion : `/promotion` s'ouvre sur **la saison 2026**, sélecteur 2027 / 2026 / 2025 présent, plus aucune mention « Championnat clos ».

### ⚠️ Leçon : dans ce projet, les données partent en production avant le code

`npm run db:migrer` écrit dans **l'unique base**, celle de la production. La migration 0065 a donc été active **dès son application**, alors que le code qui l'accompagne n'a été déployé qu'à la fusion de la PR. Entre les deux, `/moncaro` a montré aux onze joueurs concernés un bilan Promotion « 2 journées », **sans le « sur 10 »** — précisément l'affichage trompeur que la PR venait corriger. La fenêtre a duré le temps de la revue, puis s'est refermée.

**Réflexe à garder** : quand une insertion de données change ce qu'affiche un écran, et que le code qui la rend lisible n'est pas encore en production, **déployer le code d'abord, appliquer la migration ensuite** — ou prévenir Jérôme que la fusion est urgente. Une migration de pure structure, ou une donnée qu'aucun écran n'affiche encore, n'est pas concernée.

### Aperçu local

Le port 3000 de l'entrée `carreau-mondorf-nextjs` de `carreau-mondorf-app/.claude/launch.json` est pris par un autre projet local (plateforme Tanja). Une seconde entrée, **`carreau-mondorf-nextjs-3100`**, lance le serveur de dev sur le port 3100 (commit `742851f` dans `carreau-mondorf-app`). C'est elle qu'utilise l'outil d'aperçu.

### Reste ouvert

- **2025 n'a pas de bandeau** : `calendrier_federation` ne contient aucune journée de Promotion 2025, donc le total reste inconnu et le composant se tait, comme prévu. Le mécanisme couvrira 2025 le jour où ce calendrier sera renseigné — il manque la J5 dans `promotion_equipes` 2025.
- ~~**Pas de table de classement Promotion.**~~ **Fait le même jour** (0066) — voir la section suivante.
- **Les huit autres feuilles de journée** n'existent pas en ligne. Si le club conserve ses propres feuilles de journée, elles compléteraient `promotion_equipes` sans ambiguïté.
- **Test réel non fait** : le bandeau et l'en-tête n'ont pas été vus dans une session de licencié connecté. Même limite que les jours précédents. Le plus simple : se connecter en production comme licencié présent en J6 ou J10 (MARION Stéphane, FLAMMANG Marie-Jean…) et ouvrir `/moncaro` → onglet Promotion, puis `/promotion`.

## Session du 23/09/2026 (suite) — la table de classement Promotion

Jérôme : « crée la table de classement Promotion ». C'était le point laissé ouvert plus haut.

### Deux tables, parce que deux grains (migration 0066)

| Table | Une ligne = | Source |
|---|---|---|
| `promotion_resultats_club` | un club à une journée : `jouee`, `points`, `deduit` | tableau « Total Journées » (J1-J8), feuilles J6 et J10, J9 déduite |
| `promotion_classement` | un club dans un classement **publié** à l'issue d'une journée : position, rencontres, 4/4, points | `PROMO-Classement-6`, `-8`, `-10` |

2026 : **140 résultats de journée** (14 clubs × 10) et **3 classements officiels** (42 lignes). Lecture réservée aux utilisateurs autorisés, comme tout le module Promotion (0007). Aucune policy d'écriture : alimentation par migration seulement, comme `division_d2_resultats`.

`jouee` est distinct de « 0 point » : Lasauvage joue la J8 et n'y marque rien, Kayl ne la joue pas.

### Pourquoi le classement est stocké tel que publié, et non recalculé

Le départage à égalité de points se fait **au nombre de 4/4**, établi sur les documents : après J6, Mondorf (195, 2×4/4) devance KaBoule (195, 1) ; après J8, trois clubs à 280 sont rangés 4, 3, 2. Mais ce décompte n'est publié que **cumulé**, et sa règle exacte n'est écrite nulle part : en J10, une équipe du Clair-Chêne gagne ses quatre parties **sans que ce 4/4 soit compté** (le club, organisateur ce jour-là, reste à 4). Impossible à reconstituer. Même leçon qu'en D2 : s'aligner sur le classement officiel plutôt que le recalculer.

### Règles lues sur les documents, à retenir

- **Un club marque avec ses trois meilleures équipes** (parties gagnées × 5). Vérifié sur les treize clubs de chacune des deux feuilles : Boule d'Or aligne cinq équipes en J10 (2, 3, 2, 3, 1 victoires) et marque 8 × 5 = 40, pas 55. D'où **60 points au plus par journée**.
- Le tableau fédéral date la J5 au **10/05** ; `calendrier_federation` dit 09/05. ✅ **Jérôme retient la date du calendrier** : les 14 lignes J5 passent au 09/05 (migration 0067, corrigée à part plutôt qu'en modifiant 0066 déjà appliquée). 0067 ajoute un garde-fou durable : **chaque journée de `promotion_resultats_club` doit porter la date de son entrée « (Jn) » dans le calendrier fédéral** — les dix concordent.

### La J9, jamais publiée, déduite club par club

Classement après J10 − classement après J8 − points de J10. Les quatorze valeurs tombent sur un multiple de 5 positif, ce qui aurait très probablement trahi une erreur de lecture. Marquées `deduit = true`, affichées en pointillés avec un astérisque et une note.

### ⚠️ Écart dans les documents fédéraux, conservé tel quel

Kayl a **4 rencontres** dans le classement après J6, puis **3** après J8 et J10 — un compteur qui baisse. Le « Total Journées », dont le fichier porte « Vérifié », dit 3 (J1, J2, J4). `promotion_resultats_club` suit ce 3 ; `promotion_classement` garde le 4 publié après J6, puisque cette table recopie la fédération sans la corriger. ✅ **Traitement validé par Jérôme le 23/09.**

### Six garde-fous dans la migration (transaction annulée au moindre écart)

1. Chaque journée couvre exactement 14 clubs.
2. Chaque classement publié compte 14 clubs, positions 1 à 14.
3. **Somme des points de journée = points du classement**, pour chaque club et chaque classement. Après J6 et J8, c'est une vérification **indépendante** : deux documents différents concordent sur les quatorze clubs.
4. Rencontres jouées = journées marquées jouées (seule exception, nommée : Kayl après J6).
5. L'ordre publié respecte « points, puis 4/4 ».
6. Les points de Mondorf en J6 et J10 égalent la somme de ses trios dans `promotion_equipes` (0065).

**Contre-épreuve faite** : une seule cellule faussée (Mondorf J3, 20 → 25) dans une transaction annulée est détectée dans les trois classements. Le contrôle ne passe pas à vide.

### Affichage : onglet « Classement » sur `/promotion`

`ClassementPromotion` : le classement officiel, avec un sélecteur J6 / J8 / J10 (J10 par défaut, titré « Classement final ») et des flèches d'évolution depuis le classement publié précédent. Ensuite, **Carreau Mondorf journée par journée** : barres sur 60 possibles, points au-dessus de chaque barre, place du club ce jour-là en dessous.

L'onglet est ouvert à tout utilisateur autorisé, comme le calendrier — c'est un classement de clubs, pas une statistique individuelle. `Statistiques` reste réservé aux licenciés de la saison et au CA.

Le bandeau de couverture disait « Tout ce qui suit ne porte que sur les journées connues » : ce n'est plus vrai pour le classement, qui couvre toute la saison. Le texte le précise désormais.

**Bilan Promotion 2026 de Carreau Mondorf : 8e sur 14, 315 points.** Meilleures journées : J1 et J8 (45 pts, 2e du jour) ; plus difficile : J6 (15 pts, 12e).

### Vérification

- Vrai composant, vraies données (`getClassementPromotion`), rendu dans une **page d'aperçu locale temporaire** — la session était contournée par la clé serveur, faute de pouvoir se connecter à la place d'un licencié. Page supprimée avant le commit.
- **375 px** : aucun élément ne déborde. Premier essai : les noms longs étaient tronqués (« Schierener Bulle… ») ; le détail « j. · 4/4 » passe désormais sous les points sur mobile, et les noms s'affichent en entier.
- **Bureau** : 14 barres, aucun débordement, Mondorf en terracotta.
- Anonyme : 0 ligne lue sur les deux tables.
- ⚠️ **Piège d'outillage rencontré** : dans les commandes Bash de cette session, les doubles barres obliques inverses des heredocs sont réduites à une seule avant exécution. Un `'\\u00a0'` écrit par script Python est devenu un espace insécable brut, invisible, dans le source. Pour écrire une barre oblique inverse par script : `chr(92)`, ou passer par l'outil d'édition de fichier.
- Un espace avant « : » disparaissait au rendu JSX (« J9: ») ; la phrase est désormais construite en chaîne, avec l'espace insécable de la typographie française.

### Décisions de Jérôme, même jour

- **Date de la J5 : celle du calendrier, 09/05.** Les 14 lignes J5 de `promotion_resultats_club` passent du 10/05 au 09/05 par une migration à part, **0067**, plutôt qu'en modifiant 0066 déjà appliquée : le dépôt doit refléter exactement ce qui a tourné sur la base. 0067 ajoute un garde-fou durable — chaque journée doit porter la date de son entrée « (Jn) » dans le calendrier fédéral. Les dix concordent.
- **Kayl : traitement validé tel quel** (3 rencontres dans les résultats de journée, 4 conservé dans le classement publié après J6).

### Livraison

[PR #25](https://github.com/jeromedoyen/carreau-mondorf-nextjs/pull/25) fusionnée le 23/09 (`main` = `ae0c2b0`), branche conservée, déploiement Vercel en `success`. **La fusion a attendu que l'aperçu Vercel du dernier commit passe** : la PR portait du code, et un build cassé serait parti droit en production.

Ordre code/données respecté, conformément à la leçon notée plus haut : 0066 et 0067 ont été appliquées avant la fusion, mais aucun code en production ne lisait ces tables — personne n'a rien vu changer avant le déploiement.

Contrôle en production, sans connexion : `/promotion` (2026 et `?saison=2025`), `/moncaro` et `/national-d2` répondent ; les deux nouvelles tables renvoient **0 ligne** à un visiteur anonyme.

### Reste ouvert

- **L'onglet « Classement » n'a pas été vu dans une session de licencié.** Il n'apparaît qu'une fois connecté. À vérifier : `/promotion` → Classement, Carreau Mondorf 8e avec 315 points, puis le graphique de ses dix journées.
- **Saisons suivantes** : ces tables ne s'alimentent que par migration, à partir des documents FLBP. Pour une nouvelle journée publiée, inventorier d'abord la médiathèque (`/wp-json/wp/v2/media?search=PROMO`), puis ajouter les lignes et le classement publié en réutilisant les six garde-fous de 0066. Si la saisie devient fréquente, un écran CA de saisie serait à envisager — pas avant.
- **Idée non faite, à proposer** : afficher le rang du club (« 8e sur 14 ») dans l'onglet Promotion de `/moncaro`.
