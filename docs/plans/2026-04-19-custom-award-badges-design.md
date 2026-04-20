# Custom award badges — design

**Date:** 2026-04-19
**Status:** approved, implementation starting

## Problem

When a parent awards custom points — ad-hoc positive point entries with a description, outside the chore catalog — there's no badge earned. Chores already have level-up badges and achievements have milestone badges, but one-off "good deeds" leave no visible trace in the badge gallery.

The parent wants each custom award to optionally spawn a unique, AI-generated badge themed to that specific task, styled to fit alongside the existing badge collection.

## Goals

- Turn eligible custom point awards into collectible badges in Jasper's gallery
- AI-generate badge art themed to the task description
- Maintain visual cohesion with existing badges (consistent prompt template)
- Single opt-in checkbox in the existing award form, default on
- Failure-tolerant: bad generation doesn't undo the point award

## Non-goals

- Retrofit existing historical custom awards into badges
- Badge rarity / level-up mechanics for custom awards
- Per-family prompt overrides
- Auto-retry on generation failure (parent can manually regenerate)

## Design

### Data model

**Zero schema changes.** Reuse the existing `AchievementBadge` table with a dynamic `badgeId`:

- `badgeId = "custom-award-<pointEntryId>"` — unique per entry, the `unique(kidId, badgeId)` constraint naturally gives one badge per entry
- `metadata` JSON holds `{ taskDescription, points, imageUrl }`
- `earnedAt` populated at creation
- `familyId`, `kidId` as usual

This keeps the achievement badge machinery (grid, toast, gallery) working while carrying the per-entry data inside `metadata`.

### API

Extend the existing `POST /api/points` endpoint with a `generateBadge: boolean` flag.

When the flag is true and the award is custom (`choreId === null`) and `points > 0`:

1. Create the `PointEntry` as usual
2. Create an `AchievementBadge` with `metadata.imageUrl = null` and the task description
3. Inside `next/server` `after()`, call Gemini to generate the image, upload to Vercel Blob, and patch the metadata — serverless kills the function after response otherwise

Add `POST /api/achievement-badges/[id]/regenerate-image` so the parent (or kid via UI) can retry a failed or unwanted image. Synchronous call, 60s max duration.

### Gemini prompt (aesthetic consistency)

Fixed template, only `taskDescription` varies:

```
Round achievement badge sticker illustration, cartoon style,
bright cheerful colors, gold metallic trim around a white circular
background, cute centerpiece showing <taskDescription>, child-friendly
style for a 5-year-old, no text or letters.
```

Model: `gemini-2.5-flash-image` (the same one used for sight words).

### UI

**PointEntryForm (custom mode):**

- New checkbox below the note: 🎨 `Generate a badge`, default checked
- Disabled when `choreId` is set or `points <= 0` (form already locks custom mode)
- Flag sent in the POST body

**Badge gallery (BadgeShowcase / BadgeGrid):**

- Fetch endpoint returns custom-award achievement badges alongside existing ones
- Custom-award badges render from `metadata.imageUrl`
- `imageUrl === null` shows a shimmer placeholder (generating or failed)

**Badge detail modal:**

- Clicking a custom-award badge shows the image, task description, points, and date
- **Regenerate** button (parent only) calls the regenerate endpoint

### Validation

- `generateBadge` only honored when the entry is custom (not tied to a chore) and `points > 0`
- Parent-only mutation (existing `/api/points` already enforces this)
- Gemini key / Blob write failures caught in the `after()` block and logged; row stays with `imageUrl = null`

### Cost

~$0.039 per generation. A dozen custom awards/month is well under $1/month.

## Files touched

- `src/lib/gemini-image.ts` — add `generateBadgeImage(taskDescription, familyId)`
- `src/app/api/points/route.ts` — accept `generateBadge`, branch into AchievementBadge creation + `after()` image gen
- `src/components/points/PointEntryForm.tsx` — add checkbox, pass flag
- `src/app/api/badges/route.ts` — include custom-award AchievementBadges in response, or add a separate endpoint to merge in the frontend
- `src/components/badges/BadgeGrid.tsx` / `BadgeShowcase.tsx` — render custom-award badges
- `src/components/badges/BadgeDetailModal.tsx` — regenerate button
- `src/app/api/achievement-badges/[id]/regenerate-image/route.ts` — new
- `src/locales/en.json`, `src/locales/zh.json` — strings

## Implementation order

1. Design doc (this file) + commit
2. `generateBadgeImage` helper
3. `/api/points` POST extension
4. PointEntryForm checkbox
5. Gallery surface (API + component updates)
6. Regenerate endpoint + button
7. Type-check, commit incrementally, push
