# Spontaneous rewards — design

**Date:** 2026-04-19
**Status:** approved, implementation starting

## Problem

The existing rewards system assumes kids pick from a pre-defined catalog, submit a redemption, and wait for parent approval. In practice this isn't how Jasper uses it. He asks for rewards spontaneously — seeing popcorn at a supermarket, asking for ice cream on a walk — and the parent approves in the moment by logging it directly.

The catalog sits unused, the pending-approval flow adds friction when approval is already implicit, and there's no good way to capture what was exchanged (a photo of the item).

## Goals

- Let a parent log a reward deduction on the spot: item name, point cost, optional photo
- Capture the photo into the family gallery automatically so it doubles as a memory
- Retire the unused catalog and pending-approval flow
- Preserve historical records

## Non-goals

- Kid-initiated requests — parent is always with them for this flow
- Multi-step approval — single-tap log
- Categories, tags, or analytics on spontaneous rewards
- Recurring / scheduled rewards

## Design

### Who does what

Parent only. Single-step. The act of logging is the act of approving.

### Data model

No schema changes. Reuses `PointEntry`:

- `points`: negative integer (the deduction)
- `note`: item name, e.g. "Popcorn"
- `photoUrl`: Vercel Blob URL, optional
- `redemptionId`: null (not tied to any catalog row)
- `kidId`, `createdById`: as usual

When a photo is attached, a `Photo` row is also created in the same transaction:

- `familyId`, `kidId`: same as the PointEntry
- `photoUrl`: same Blob URL (single upload, two references)
- `caption`: the item name
- `createdById`: the parent

This makes the photo appear in the existing family gallery without any join or extra query.

### API

New endpoint:

```
POST /api/point-entries/reward
Body: { kidId, note, points, photoUrl? }
```

- Requires parent + family
- `points` is supplied as a positive integer by the client; the server stores `-points`
- Validates kid belongs to same family
- Creates PointEntry + (if photoUrl) Photo in a single `prisma.$transaction`
- Returns `{ pointEntry }`

Uploads still go through the existing `/api/upload` route.

### UI

**Entry point:** a single `🎁 Log reward` button, rendered in two places:

- `ParentDashboardHeader` — in-the-moment access from the home screen
- Parent `/ledger` page — for when you're already reviewing points

Both open the same modal.

**LogRewardModal:**

- Kid picker (dropdown; auto-selected if only one kid)
- "What was it?" — text input, required, trimmed, max 100 chars
- "Points to deduct" — number input, required, integer 1–999
- Photo — optional. `<input type="file" accept="image/*" capture="environment">` on mobile opens the camera directly. Preview + remove shown once attached. Uses existing `/api/upload` route.
- Submit button "Log reward"

On success: modal closes, brief success feedback, page refreshes whatever list is below.

### Kid-facing view

- Existing `/points/history` and `/points` ledger already show deductions as negative entries with their note. We add a small photo thumbnail inline for any row where `photoUrl` is set, so Jasper can scroll back and see the things he's picked.
- Family photo gallery at `/gallery` shows the auto-created Photo rows alongside other photos. No new UI needed there.

### Validation

- Note: trimmed, non-empty, ≤ 100 chars
- Points: integer 1–999 (stored negated)
- Photo: reuses existing 5MB limit on `/api/upload`
- Kid must belong to the logging parent's family

## Removal

The following are deleted outright. No backwards-compatibility shims.

**Pages:**

- `src/app/(parent)/rewards/page.tsx`
- `src/app/(kid)/redeem/page.tsx`
- `src/app/(parent)/view-as/redeem/page.tsx`

**Components:**

- `src/components/rewards/RewardsList.tsx`
- `src/components/rewards/RewardForm.tsx`
- `src/components/rewards/KidRewardsView.tsx`
- `src/components/rewards/RedeemHeader.tsx`
- `src/components/parent/RewardsPageHeader.tsx`

**API routes:**

- `src/app/api/rewards/route.ts`
- `src/app/api/rewards/[id]/route.ts`
- `src/app/api/redemptions/route.ts`
- `src/app/api/redemptions/[id]/approve/route.ts`
- `src/app/api/redemptions/[id]/deny/route.ts`

**Nav entries:** "Rewards" (parent desktop + mobile), "Redeem" (kid desktop + mobile, plus view-as).

**Tests:** `src/__tests__/api/redemptions/redemptions.test.ts`.

**Locale strings:** dead keys under `rewards`, `redeem`, `redemption` in `en.json` and `zh.json`.

## What's preserved

- `Reward` and `Redemption` DB tables — historical rows stay intact
- `PointEntry.redemptionId` column — past approved redemptions still link to their Redemption rows; nothing new ever sets this field again
- Past `PointEntry` rows with negative points from the old flow — visible as usual in history

## Implementation order

1. Design doc (this file) + commit
2. New `/api/point-entries/reward` endpoint
3. `LogRewardModal` component
4. Wire modal into dashboard header + ledger page
5. Photo thumbnails in kid's points history
6. Delete old rewards/redemption UI, API, nav, tests, locale strings in one sweep
7. Type-check, commit incrementally, push
