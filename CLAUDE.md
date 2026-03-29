# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

GemSteps — a family engagement platform for chore tracking, points/rewards, meal planning, and learning activities. Built with Next.js 16, TypeScript, PostgreSQL (Neon), and Prisma.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # prisma generate && next build
npm run lint         # ESLint (flat config, v9)
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
npm run test:run -- src/__tests__/lib/math-utils.test.ts  # Run a single test file
npm run test:coverage # Vitest with v8 coverage
npx prisma migrate dev      # Run database migrations
npx prisma generate         # Regenerate Prisma client after schema changes
npx prisma studio           # Visual database browser (localhost:5555)
```

## Architecture

### Next.js App Router with Route Groups

Routes are organized by role using parenthesized groups:
- `src/app/(auth)/` — login, signup (public)
- `src/app/(parent)/` — parent-only pages (chores, rewards, ledger, meals, settings)
- `src/app/(kid)/` — kid-only pages (points, learn, redeem)
- `src/app/api/` — RESTful API routes (~23 endpoint groups)

### Data Flow Pattern

- **Server components** (default) fetch data directly via Prisma
- **Client components** (`"use client"`) call API routes for mutations
- Minimal client state — most state is server-side; only SessionProvider, LocaleProvider, and KidModeProvider use React Context

### Auth & Permissions (`src/lib/auth.ts`, `src/lib/permissions.ts`)

NextAuth.js v5 (beta) with JWT strategy. Two providers: Google OAuth and credentials (email/password). Sessions are extended with `role` (PARENT/KID) and `familyId`.

API routes use permission helpers for authorization:
- `requireAuth()` — any authenticated user
- `requireParent()` — PARENT role only
- `requireFamily()` — must belong to a family
- `requireParentInFamily()` — both parent + family member

### Database (`prisma/schema.prisma`)

PostgreSQL everywhere. Production uses Neon (`DATABASE_URL="postgresql://..."`); local dev uses PGlite (`DATABASE_URL="./pglite/dev"`), an embedded PostgreSQL that needs no server. Prisma client is a global singleton (`src/lib/db.ts`) that selects the adapter based on `DATABASE_URL`. All shared resources are scoped by `familyId`. Two user roles: `PARENT` and `KID`.

After any schema change: run `npx prisma migrate dev` then `npx prisma generate`.

### Database Rules

- **DB adapter logic stays in `src/lib/db.ts`** — do not import `@prisma/adapter-pg`, `pg`, or `@electric-sql/pglite` anywhere else

### i18n (`src/components/LocaleProvider.tsx`)

next-intl with client-side locale switching (no route-based localization). Translations in `src/locales/en.json` and `src/locales/zh.json`. Uses `useTranslations()` hook from next-intl and custom `useLocale()` hook for language switching. Locale persisted in localStorage.

### Root Layout Provider Stack

```
SessionProvider > LocaleProvider > KidModeProvider > NavBar + main + MobileNav
```

### Testing (`vitest.config.ts`)

Vitest with jsdom, globals enabled. Tests in `src/__tests__/` with subdirs for `lib/`, `api/`, `components/`. Setup file (`src/__tests__/setup.ts`) mocks `next/navigation` and `next-auth/react`. Path alias `@` resolves to `./src`.

### Path Alias

`@/*` maps to `./src/*` (configured in both tsconfig.json and vitest.config.ts).

### External Integrations

- **Anthropic Claude SDK** — AI-powered meal health feedback and math analysis (`src/app/api/meal-plans*/feedback/`, `src/app/api/math/analyze/`)
- **Vercel Blob** — photo/image uploads (`src/app/api/upload/`)
- **Resend** — transactional email
- **Google Calendar** — family event sync (`src/app/api/calendar/`)
- **Philips Hue** — smart light control via OAuth (`src/app/api/hue/`)

### Git Hooks (Husky)

- **pre-push**: runs `npm run build` (prisma generate + next build) — pushes will fail if build fails
- **pre-commit**: currently a no-op

## Deployment

- **Production URL**: https://chore-points-app-seven.vercel.app
- **Hosting**: Vercel (auto-deploys from `origin/main` on GitHub push)
- **Database**: Neon PostgreSQL (project: `chore-points-app`, region: us-east-2)
- **Redeploy after env var changes** (no code change needed):
  ```bash
  npx vercel redeploy chore-points-app-seven.vercel.app
  ```
- **Set env vars**:
  ```bash
  echo "value" | npx vercel env add VAR_NAME production
  ```
- **Run migrations against production DB**:
  ```bash
  DATABASE_URL="<neon-url>" npx prisma migrate deploy
  ```

## Key Conventions

- Tailwind CSS v4 for all styling (no separate tailwind.config — uses PostCSS plugin)
- API routes follow REST conventions with route.ts files under `src/app/api/`
- All database entities use audit trails (createdBy/updatedBy) where applicable
