# Contexte du projet — Reconstruction Next.js (Carreau Mondorf — Compétition)

Ce fichier résume l'état complet de ce projet pour reprendre le travail sans perdre le contexte accumulé. **À lire en entier avant toute modification.** Écrit pour amorcer une nouvelle conversation à contexte léger — voir aussi `carreau-mondorf-app/CLAUDE.md` et `carreau-mondorf-app/CONTEXTE_PROJET.md` pour le projet frère (l'application de référence, en production).

Dernière mise à jour : 22/07/2026, Phase 1 de la feuille de route "développement total" — statistiques individuelles.

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

### ⚠️ Contrainte d'environnement importante : `git push` doit être fait par Jérôme

L'outil Bash de Claude dans cette session n'a pas d'accès interactif à GitHub (pas de `/dev/tty`, pas de navigateur pour l'auth OAuth/Credential Manager). Claude peut committer localement, mais **le push doit systématiquement être relancé par Jérôme depuis son propre PowerShell** :
```powershell
cd C:\Users\jerom\carreau-mondorf-nextjs
git push
```
Si GitHub redemande un jeton (Personal Access Token) : le nom d'utilisateur GitHub dans le champ "Username", le jeton **uniquement** dans le champ "Password" — ne jamais les confondre (déjà arrivé une fois, jeton révoqué par précaution après coup, sans conséquence puisque le push avait déjà réussi).

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

1. **Statistiques individuelles** (National D2 + Promotion) — **FAIT**, voir session ci-dessous.
2. **Calendrier fédération unifié** — table `calendrier_federation` déjà importée (26 événements), aucune page ne l'affiche encore. Pas de blocage, prochaine étape naturelle.
3. **Authentification** — à décider : Supabase Auth natif (magic link/OTP) plutôt que réimplémenter l'OTP Brevo maison de l'app d'origine. Bloquant pour les phases 4 et 5.
4. **Registre membres/licenciés** — RGPD-sensible, nécessite la phase 3 d'abord.
5. **Actions CA en écriture** (saisie feuille de match, forfait, édition rencontre) — nécessite auth + rôle CA + policies Supabase en écriture (RLS actuellement lecture seule pour tout le monde, écriture uniquement via la clé de service du script d'import).

**Décision actée** : les statistiques individuelles sont **publiques pour l'instant** (cohérent avec le périmètre 100% public actuel du prototype), alors qu'elles sont réservées au CA dans l'app d'origine (`requireMembreCA_`) — à reverrouiller une fois la phase 3 (auth) faite.

## Périmètre non couvert (pistes pour la suite, pas encore commencées)

- **Actions CA** : saisie de feuille de match, déclaration de forfait, édition d'une rencontre — tout ça reste dans l'app Apps Script pour l'instant (phase 5 ci-dessus).
- **Authentification** : ce prototype est 100% public/sans connexion (phase 3 ci-dessus).
- **Registre membres/licenciés** : pas commencé, RGPD-sensible, phase ultérieure (phase 4 ci-dessus).
- **Calendrier fédération unifié** (tournois, Coupe de Luxembourg) : la table existe, aucune page ne l'affiche encore (phase 2 ci-dessus).

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
- **Pas encore fait** : commit + push (Jérôme, comme d'habitude) ; déploiement Vercel de cette phase ; validation visuelle humaine.
