# Sight Word Recycling

## Overview

When all sight words have been learned, automatically recycle through them in the same order (word #1, #2, etc.) so Jasper always has a word to practice. Each correct recycled quiz earns 1 point, same as new words.

## Approach

Modify the `/api/sight-words/today` endpoint to detect when all words are complete and loop back. Reset `pointAwarded` on the next review word so the kid can earn points again. No new models or schema changes.

## Backend Logic (`/api/sight-words/today`)

Current flow:
1. Iterate active words in sort order
2. Find first word where `quizPassedAt` is null or not today
3. If all done → return `allComplete`

New flow:
1. Iterate active words in sort order
2. Find first word where `quizPassedAt` is null → serve it (new word, `isReview: false`)
3. If all words have `quizPassedAt` set:
   a. Check if any word was already quizzed today → return `alreadyCompletedToday`
   b. Otherwise, find the first word (by sort order) where `pointAwarded = true` → reset `pointAwarded = false` and serve it (`isReview: true`)
   c. If all words already have `pointAwarded = false` (full review cycle done), reset all to `pointAwarded = true` and start from word #1 again

The quiz endpoint (`/api/sight-words/quiz`) needs no changes — it already upserts `quizPassedAt` to today and sets `pointAwarded = true` with a point award.

## API Response Change

Add `isReview: boolean` to the `/api/sight-words/today` response. `true` when serving a recycled word, `false` for new words.

## UI Changes (`LearnView.tsx`)

- When `isReview === true`, show a "Review" label above the flashcard
- Progress indicator shows "Review X of Y" instead of "X of Y words learned"
- Remove the "all complete" celebration screen (there's always a word to do now)

## No Schema Changes

Reuses existing `SightWordProgress` fields: `quizPassedAt` and `pointAwarded`. No new models or migrations.

## Constraints

- Recycling only activates when ALL active words are learned
- Order is same as parent-set sort order
- 1 word per day (same as current)
- 1 point per correct answer (same as current)
