# Sight Word Recycling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** When all sight words are learned, automatically recycle through them so Jasper always has a word to practice, earning 1 point per correct recycled quiz.

**Architecture:** Modify the `/api/sight-words/today` endpoint to detect all-complete and loop back through words in sort order, resetting `pointAwarded` to allow re-earning points. Add `isReview` flag to the API response. Update `LearnView.tsx` to show a "Review" label and remove the all-complete celebration screen. No schema changes.

**Tech Stack:** Next.js App Router, Prisma, TypeScript, next-intl (en/zh)

---

### Task 1: Modify `/api/sight-words/today` to recycle words

**Files:**
- Modify: `src/app/api/sight-words/today/route.ts:108-115`

**Step 1: Implement recycling logic**

Replace the current "all complete" block (lines 108-115) with recycling logic. The full new flow for the `!todaysWord` case:

```typescript
    // If all words have been completed (no todaysWord found)
    if (!todaysWord) {
      // Check if any word was already quizzed today
      const anyCompletedToday = allWords.some((word) => {
        const wp = progressMap.get(word.id);
        if (!wp?.quizPassedAt) return false;
        return getLocalDateString(new Date(wp.quizPassedAt), timezone) === todayLocal;
      });

      if (anyCompletedToday) {
        return NextResponse.json({
          sightWord: null,
          message: "alreadyCompletedToday",
          isReview: true,
          progress: { current: allWords.length, total: allWords.length },
        });
      }

      // Find first word (by sort order) where pointAwarded = true → reset and serve
      let reviewWord = null;
      for (const word of allWords) {
        const wp = progressMap.get(word.id);
        if (wp?.pointAwarded) {
          // Reset pointAwarded so kid can earn again
          await prisma.sightWordProgress.update({
            where: {
              kidId_sightWordId: { kidId: targetKidId, sightWordId: word.id },
            },
            data: { pointAwarded: false },
          });
          reviewWord = word;
          break;
        }
      }

      if (!reviewWord) {
        // All words have pointAwarded = false (full cycle done) — reset all and start over
        await prisma.sightWordProgress.updateMany({
          where: { kidId: targetKidId, sightWordId: { in: allWords.map((w) => w.id) } },
          data: { pointAwarded: true },
        });
        // Now pick word #1 again
        const firstWord = allWords[0];
        await prisma.sightWordProgress.update({
          where: {
            kidId_sightWordId: { kidId: targetKidId, sightWordId: firstWord.id },
          },
          data: { pointAwarded: false },
        });
        reviewWord = firstWord;
      }

      return NextResponse.json({
        sightWord: {
          id: reviewWord.id,
          word: reviewWord.word,
          imageUrl: reviewWord.imageUrl,
        },
        alreadyCompletedToday: false,
        isReview: true,
        progress: { current: allWords.length, total: allWords.length },
      });
    }
```

Also add `isReview: false` to the existing non-review response (line 117-128):

```typescript
    return NextResponse.json({
      sightWord: {
        id: todaysWord.id,
        word: todaysWord.word,
        imageUrl: todaysWord.imageUrl,
      },
      alreadyCompletedToday,
      isReview: false,
      progress: {
        current: completedCount,
        total: allWords.length,
      },
    });
```

**Step 2: Verify the endpoint works**

Run: `npm run test:run` (if tests exist for this endpoint) or `npm run build` to check for type errors.

**Step 3: Commit**

```bash
git add src/app/api/sight-words/today/route.ts
git commit -m "feat: add sight word recycling to /api/sight-words/today"
```

---

### Task 2: Update `LearnView.tsx` for review mode

**Files:**
- Modify: `src/components/learn/LearnView.tsx`

**Step 1: Add `isReview` to the TodayResponse type**

```typescript
type TodayResponse = {
  sightWord: SightWord | null;
  alreadyCompletedToday?: boolean;
  isReview?: boolean;
  message?: string;
  progress: { current: number; total: number };
};
```

**Step 2: Replace allComplete block with review-aware logic**

Remove lines 151-166 (the `allComplete` message block). The `message === "alreadyCompletedToday"` case is now handled differently:

```typescript
  // All words completed and already reviewed today
  if (data?.message === "alreadyCompletedToday") {
    return (
      <div className="text-center py-16">
        <span className="text-8xl mb-4 block">✅</span>
        <h2 className="text-2xl font-bold text-gray-700 mb-2">{t("allDoneToday")}</h2>
        <p className="text-gray-500">{t("allDoneTodayDesc")}</p>
        <div className="mt-6">
          <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-700 rounded-full">
            <span className="font-bold">{data.progress.total}/{data.progress.total}</span>
            <span className="ml-2">{t("wordsLearned")}</span>
          </div>
        </div>
      </div>
    );
  }
```

**Step 3: Add "Review" label above flashcard when `isReview`**

In the flashcard section (around line 189), add a review badge:

```typescript
          {data.isReview && (
            <div className="mb-2">
              <span className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                🔄 {t("reviewWord")}
              </span>
            </div>
          )}
          <h2 className="text-lg font-semibold text-gray-600 mb-4">
            {data.isReview ? t("reviewTodaysWord") : t("todaysWord")}
          </h2>
```

**Step 4: Update progress text for review mode**

In the progress bar section, show review-specific text:

```typescript
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{data?.isReview ? t("reviewProgress") : t("progress")}</span>
          <span>{progress.current}/{progress.total}</span>
        </div>
```

**Step 5: Verify build**

Run: `npm run build`

**Step 6: Commit**

```bash
git add src/components/learn/LearnView.tsx
git commit -m "feat: add review mode UI to LearnView"
```

---

### Task 3: Add i18n strings

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

**Step 1: Add new keys to en.json**

In the `learn` section, add:

```json
"reviewWord": "Review",
"reviewTodaysWord": "Review Word",
"reviewProgress": "Review Progress",
"allDoneToday": "All done for today!",
"allDoneTodayDesc": "Come back tomorrow for your next review word.",
"wordsLearned": "words learned"
```

**Step 2: Add corresponding keys to zh.json**

```json
"reviewWord": "复习",
"reviewTodaysWord": "复习单词",
"reviewProgress": "复习进度",
"allDoneToday": "今天都做完了！",
"allDoneTodayDesc": "明天再来复习下一个单词。",
"wordsLearned": "个单词已学会"
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/locales/en.json src/locales/zh.json
git commit -m "feat: add i18n strings for sight word review mode"
```

---

### Task 4: Final build verification and push

**Step 1: Full build check**

Run: `npm run build`

Expected: Build succeeds with no errors.

**Step 2: Push**

```bash
git push
```
