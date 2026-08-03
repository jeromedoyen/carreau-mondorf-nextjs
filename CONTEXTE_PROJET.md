# Contexte du projet — Reconstruction Next.js (Carreau Mondorf — Compétition)

Ce fichier résume l'état complet de ce projet pour reprendre le travail sans perdre le contexte accumulé. **À lire en entier avant toute modification.** Écrit pour amorcer une nouvelle conversation à contexte léger — voir aussi `carreau-mondorf-app/CLAUDE.md` et `carreau-mondorf-app/CONTEXTE_PROJET.md` pour le projet frère (l'application de référence, en production).

Dernière mise à jour : 01/08/2026 (voir section dédiée en fin de fichier — pipeline pense-bête vocal, saga authentification lien magique/revert, module remboursements Phase 1 rejeté, suppression de manifestation). Connexion : **OTP à 6 chiffres saisi manuellement** — un essai de lien magique a eu lieu entre le 27/07 et le 01/08/2026 et a été intégralement annulé par Jérôme, voir section dédiée.

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

Jérôme a demandé de poursuivre le développement complet du prototype (pas juste le module Compétition en lecture seule). Séquencée en 5 phases :

1. **Statistiques individuelles** (National D2 + Promotion) — **FAIT**, voir session du 22/07.
2. **Calendrier fédération unifié** — **FAIT**, voir session du 22/07.
3. **Authentification** — **code fait**, config Dashboard Supabase restante (voir session ci-dessous). Décidé avec Jérôme : Supabase Auth natif (OTP email) + SMTP Brevo (pas de portage maison de l'OTP), plus une table `acces` minimale (email+nom, pas le registre complet) important de l'onglet "Accès" pour restreindre qui peut se connecter.
4. **Registre membres/licenciés** — RGPD-sensible, nécessite la phase 3 d'abord.
5. **Actions CA en écriture** (saisie feuille de match, forfait, édition rencontre) — nécessite auth + rôle CA + policies Supabase en écriture (RLS actuellement lecture seule pour tout le monde, écriture uniquement via la clé de service du script d'import).

**Décision actée** : les statistiques individuelles sont **publiques pour l'instant** (cohérent avec le périmètre 100% public actuel du prototype), alors qu'elles sont réservées au CA dans l'app d'origine (`requireMembreCA_`) — à reverrouiller une fois la phase 3 (auth) faite.

## Périmètre non couvert (pistes pour la suite, pas encore commencées)

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
- Piste technique évoquée : "Hermès" pour porter ce flux — nom non identifié dans le stack actuel, à clarifier avec Jérôme avant tout chantier. Cloud reste un environnement de dev, pas un composant de l'app.
- **Lien direct avec l'existant** : chevauche `SaisieConcoursEtSuivi.tsx` (saisie manuelle actuelle, `/concours`) et pourrait réutiliser le pipeline `services/notes-vocales/` (Telegram → faster-whisper → Supabase) déjà en prod plutôt qu'un nouveau canal de capture.
- Vu le rejet Phase 1 du module remboursements ("pas intuitif", voir plus haut) et la note de process du 01/08/2026, toute suite à donner devra repasser par une maquette/discussion avec Jérôme avant du code.
