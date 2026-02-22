# Custom Math Questions Scheduling

## Overview

Allow parents to manually set math questions for a specific kid on a specific date. When custom questions exist for a day, they fully replace auto-generated questions. If no custom questions are scheduled, the kid gets auto-generated questions as usual. Points are awarded 1 per correct answer (for both custom and auto-generated questions).

## Approach

Extend the existing `CustomMathQuestion` model with `scheduledDate` and `kidId` fields. Modify the daily question flow to check for scheduled custom questions first. Change point awarding from 1-point-for-all to 1-point-per-correct-answer.

## Data Model Changes

### CustomMathQuestion — new fields

- `scheduledDate String?` — "YYYY-MM-DD" format. Null means unscheduled (question bank).
- `kidId String?` — which kid this assignment is for.
- New index: `@@index([familyId, kidId, scheduledDate])` for fast daily lookup.

### MathProgress — no schema changes

- `pointAwarded` becomes a "all complete" flag for streak tracking.
- `questionsCompleted` tracks how many correct answers (and points) have been given.
- Points are awarded per correct answer via individual `PointEntry` records.

## API Changes

### GET /api/math/today

1. Query `CustomMathQuestion` for matching `familyId + kidId + scheduledDate`.
2. If custom questions found: return them, set `questionsTarget` to the count.
3. If not found: fall back to auto-generation (current behavior).
4. Response includes `source: "custom" | "auto"` field.

### POST /api/math/submit

- Award 1 point immediately on each correct answer.
- Create `PointEntry` with note "Math: custom question" or "Math: daily practice".
- Still increment `questionsCompleted` and set `pointAwarded = true` when all done (for streaks).

### POST /api/math/questions

- Accept optional `scheduledDate` and `kidId` fields.
- Validate: max 10 questions per kid per date.
- Validate: `scheduledDate` must be today or future.

### GET /api/math/questions

- Accept optional `scheduledDate` and `kidId` query params for filtering.

## UI Changes

### Parent: Schedule Questions UI

- Located on or linked from the math settings page (`/learn/settings`).
- Date picker to select scheduling date.
- Kid selector (defaults if only one kid).
- Up to 10 question rows, each with question text + numeric answer.
- Add/remove row controls.
- Shows existing scheduled questions when a date is selected (editable).
- Visual indicators for which upcoming days have custom questions.

### Kid: MathModule.tsx

- When `source === "custom"`, display free-form question text.
- Show "+1 point" feedback after each correct answer.
- Progress indicator and confetti celebration unchanged.

## Constraints

- Max 10 custom questions per kid per date.
- Free-form question text with numeric answer only.
- Custom questions fully replace auto-generated for that day.
- No changes to analytics, streaks, or AI analysis — they read from MathAttempt which keeps the same shape.
