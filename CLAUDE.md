# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Before doing anything else

Read `CONTEXTE_PROJET.md` in full — it is the authoritative, actively-maintained session log for this project: why it exists, what's been built, open issues, and design decisions. More current than this file for anything project-state-related. Update it at the end of any session that changes app behavior, data, or leaves work unfinished.

## Project

A from-scratch Next.js reconstruction of the "Compétition" module of `carreau-mondorf-app` (a Google Apps Script club-management webapp for Carreau Boules et Pétanque Mondorf a.s.b.l., a Luxembourg pétanque club). Built to prove that the same business logic can run with far better performance and a much stronger visual identity than Apps Script allows.

**Independent of `carreau-mondorf-app`**: separate repo, separate deployment, one-time CSV → Supabase data copy with no ongoing sync. The Apps Script app remains the club's live production tool; this project is a prototype until validated. All user-facing text is French.

**Scope, growing per an agreed 5-phase roadmap** (see `CONTEXTE_PROJET.md`): started read-only/no-auth (Compétition module only), now adding individual player stats, a unified federation calendar, and authentication (Supabase Auth + email OTP). Still no CA write actions or full member registry — those are later phases, still gated behind auth.

## Stack

Next.js 16 (App Router, Server Components, TypeScript) + Tailwind CSS v4, data in Supabase (Postgres), deployed on Vercel. No shadcn/ui CLI/Radix — the app doesn't need complex accessible primitives yet, so the design system is hand-built Tailwind v4 tokens (`src/app/globals.css`).

## Commands

```bash
npm run dev      # local dev server
npm run build    # production build — run before every deploy
npm run lint     # ESLint
npx tsc --noEmit                        # typecheck the Next.js app
npx tsc --noEmit -p scripts/tsconfig.json  # typecheck the standalone scripts/ (excluded from the app's tsconfig)
npm run import -- --rencontres <csv> --division <csv> --promotion <csv> --federation <csv> --parties <csv> --acces <csv> [--dry-run]
```

**Deploy**: `git push` to `main` → Vercel builds and deploys automatically. **Claude cannot run `git push` itself in this environment** (no interactive GitHub auth available to the sandboxed shell) — always ask the user to run it from their own terminal, and never ask them to paste a token/secret into chat.

## Architecture

- `src/lib/supabase.ts` — Supabase client using the public anon key (safe: RLS only permits read).
- `src/lib/data.ts` — all data-fetching + business logic. `getClassementDivisionD2()` is a faithful line-for-line port of `getClassementDivisionD2()` from `carreau-mondorf-app/DivisionD2Backend.gs` (same ranking rule: victories desc, then point-difference desc, then points-scored desc) — don't reinvent this, keep it in sync with the source of truth if the source algorithm ever changes.
- `src/lib/types.ts` — shared TypeScript shapes matching the Apps Script data model.
- `src/components/Classement*.tsx` — the emphasis ranking chart (Carreau Mondorf highlighted, other clubs as gray/context lines) and its supporting bar-list view. This exact chart design was already validated with the user on the Apps Script side before being ported here — don't redesign the interaction model (hover/tap → crosshair + tooltip + synced bar list), only re-skin colors if needed.
- `scripts/import-csv.ts` + `scripts/club-aliases.ts` + `scripts/parse-date.ts` — one-time/repeatable data import from CSV exports of the original app's Google Sheets. Watch for the "Journée" column format difference (`J10` in some sheets, plain `10` in others — see `parseJournee()`).
- `supabase/migrations/0001_init.sql` — schema for the read-only Compétition tables. `0002_acces.sql` adds the `acces` allowlist table + the `verifier_acces_avant_creation()` Postgres function for the Supabase "Before user created" Auth Hook. Both applied manually via the Supabase SQL editor (no Supabase CLI wired up) — new migrations need the same manual step, and Auth Hooks additionally need wiring in the Dashboard (Authentication → Hooks), which Claude cannot do itself.
- `src/lib/stats.ts` — individual player statistics. `getStatistiquesJoueursD2()` is a faithful port of `calculerStatistiquesJoueurs_()` from `carreau-mondorf-app/ChampionnatBackend.gs` (same name-normalization grouping, same sort). `getStatistiquesPromotion()` has no original to port from (that computation never existed in the source app) — Promotion player names have known unreconciled duplicates (typos never cleaned at the source), that's expected, not a bug to fix here.
- **Auth**: Supabase Auth (email OTP, no passwords) — `src/lib/supabase/client.ts` (browser), `src/lib/supabase/server.ts` (Server Components/Actions, via `next/headers` cookies), `src/proxy.ts` (Next.js 16's renamed `middleware.ts` — refreshes the session cookie every request). Login UI: `src/app/connexion/page.tsx` + `src/components/ConnexionForm.tsx`. **Keep any auth-state read out of Server Components rendered in the root layout** (i.e., out of `NavBar.tsx`) — calling `cookies()`/`getUser()` there forces every page in the tree to dynamic rendering, defeating the static-prerender speed pitch this whole project exists to prove. Auth state lives client-side instead, in `src/components/AuthNavLink.tsx` (hydrates via `onAuthStateChange`).

## Design direction

"Riviera / boulodrome" — warm terracotta/pine-green/brass/sand palette, Fraunces (display, italic) + Bebas Neue (scoreboard-style accents) + Work Sans (body), deliberately distinct from `carreau-mondorf-app`'s blue/red charte graphique. This was an explicit user request ("effet waouh", not a v1 copy) — don't pull the design back toward the original app's colors/fonts without being asked.

## Exigence produit : audit des modifications (décidée le 23/07/2026)

Toute future action d'écriture (Phase 4 registre membres, Phase 5 actions CA) doit enregistrer **qui** a fait **quoi** — ajout, modification, ou suppression — via la session authentifiée, pas juste la donnée finale. Demande explicite de Jérôme, à respecter dès la première table/action d'écriture construite : prévoir soit des colonnes `modifie_par`/`modifie_le` (+ `cree_par`/`cree_le`) sur chaque table mutable, soit une table `journal_modifications` dédiée (table, ligne, action, ancien/nouvel état, `auth.uid()`/email, horodatage) — trancher au moment de concevoir la première action d'écriture plutôt que d'improviser après coup. Ne s'applique qu'aux données mutables ; les tables actuelles (Compétition) sont en lecture seule, non concernées pour l'instant.

## Secrets

`.env.local` (gitignored) holds `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe, public by design) and `SUPABASE_URL` / `SUPABASE_SECRET_KEY` (full DB access, bypasses RLS — used only by the import script). **Never ask the user to paste the secret key (or a GitHub token) into chat** — have them edit `.env.local` directly and just confirm "done." This has gone wrong twice already this project (see `CONTEXTE_PROJET.md`).
