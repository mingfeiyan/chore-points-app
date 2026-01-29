# Learning Center Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Expand the `/learn` page from sight words only to a "Learning Center" with two sequential modules: Sight Words (1 point) → Math (1 point).

**Architecture:** The existing `LearnView` component handles sight words. We'll wrap it in a new `LearningCenter` component that orchestrates the sequential flow. A new `MathModule` handles the math problems. Both modules share a progress indicator at the top.

**Tech Stack:** Next.js 14 App Router, Prisma/PostgreSQL, React, next-intl, canvas-confetti.

---

## Task 1: Add MathProgress Model to Database

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add MathProgress model**

Add after the `SightWordProgress` model (around line 425):

```prisma
model MathProgress {
  id                  String    @id @default(cuid())

  kidId               String
  kid                 User      @relation("KidMathProgress", fields: [kidId], references: [id], onDelete: Cascade)

  date                String    // "YYYY-MM-DD" in user's timezone
  additionPassedAt    DateTime?
  subtractionPassedAt DateTime?
  pointAwarded        Boolean   @default(false)

  createdAt           DateTime  @default(now())
  updatedAt           DateTime  @updatedAt

  @@unique([kidId, date])
  @@index([kidId])
}
```

**Step 2: Add relation to User model**

In the `User` model (around line 58, after `sightWordProgress`), add:

```prisma
  mathProgress        MathProgress[] @relation("KidMathProgress")
```

**Step 3: Run migration**

Run: `npx prisma migrate dev --name add_math_progress`

Expected: Migration creates `MathProgress` table successfully.

**Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(learn): add MathProgress model for daily math tracking"
```

---

## Task 2: Create Math Utility Functions

**Files:**
- Create: `src/lib/math-utils.ts`

**Step 1: Create the math utilities file**

```typescript
// Seeded random number generator (mulberry32)
function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Create a seed from date string and kidId
function createSeed(dateStr: string, kidId: string): number {
  let hash = 0;
  const combined = dateStr + kidId;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export type MathProblem = {
  a: number;
  b: number;
  answer: number;
};

export type DailyMathProblems = {
  addition: MathProblem;
  subtraction: MathProblem;
};

/**
 * Generate deterministic math problems for a given date and kid.
 * Addition: two numbers that sum to <= 99
 * Subtraction: first number <= 100, second <= first (result >= 0)
 */
export function generateDailyMathProblems(
  dateStr: string,
  kidId: string
): DailyMathProblems {
  const seed = createSeed(dateStr, kidId);
  const random = mulberry32(seed);

  // Addition: a + b <= 99
  // Pick a between 1-98, then b between 1-(99-a)
  const addA = Math.floor(random() * 98) + 1; // 1-98
  const maxAddB = 99 - addA;
  const addB = Math.floor(random() * maxAddB) + 1; // 1 to (99-a)

  // Subtraction: a <= 100, b <= a, result >= 0
  // Pick a between 2-100, then b between 1-(a-1) to ensure positive result
  const subA = Math.floor(random() * 99) + 2; // 2-100
  const subB = Math.floor(random() * (subA - 1)) + 1; // 1 to (a-1)

  return {
    addition: { a: addA, b: addB, answer: addA + addB },
    subtraction: { a: subA, b: subB, answer: subA - subB },
  };
}

/**
 * Get today's date string in the given timezone.
 */
export function getLocalDateString(
  date: Date,
  timezone: string = "America/Los_Angeles"
): string {
  return date.toLocaleDateString("en-CA", { timeZone: timezone }); // "YYYY-MM-DD"
}
```

**Step 2: Commit**

```bash
git add src/lib/math-utils.ts
git commit -m "feat(learn): add math problem generation utilities"
```

---

## Task 3: Create GET /api/math/today Endpoint

**Files:**
- Create: `src/app/api/math/today/route.ts`

**Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import {
  generateDailyMathProblems,
  getLocalDateString,
} from "@/lib/math-utils";

// GET /api/math/today - Get today's math problems and completion status
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const timezone = searchParams.get("timezone") || "America/Los_Angeles";

    // Determine target kid ID
    const targetKidId =
      kidId || (session.user.role === "KID" ? session.user.id : null);

    if (!targetKidId) {
      return NextResponse.json(
        { error: "kidId parameter required for parents" },
        { status: 400 }
      );
    }

    // Verify kid belongs to same family
    const kid = await prisma.user.findUnique({
      where: { id: targetKidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Kid not found or not in your family" },
        { status: 404 }
      );
    }

    // Get today's date in user's timezone
    const todayStr = getLocalDateString(new Date(), timezone);

    // Generate today's problems (deterministic based on date + kidId)
    const problems = generateDailyMathProblems(todayStr, targetKidId);

    // Get progress for today
    const progress = await prisma.mathProgress.findUnique({
      where: {
        kidId_date: {
          kidId: targetKidId,
          date: todayStr,
        },
      },
    });

    return NextResponse.json({
      addition: { a: problems.addition.a, b: problems.addition.b },
      subtraction: { a: problems.subtraction.a, b: problems.subtraction.b },
      additionComplete: !!progress?.additionPassedAt,
      subtractionComplete: !!progress?.subtractionPassedAt,
      pointAwarded: !!progress?.pointAwarded,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message.includes("Forbidden") ? 403 : 401 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/math/today/route.ts
git commit -m "feat(learn): add GET /api/math/today endpoint"
```

---

## Task 4: Create POST /api/math/submit Endpoint

**Files:**
- Create: `src/app/api/math/submit/route.ts`

**Step 1: Create the API route**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import {
  generateDailyMathProblems,
  getLocalDateString,
} from "@/lib/math-utils";

// POST /api/math/submit - Submit a math answer
export async function POST(req: Request) {
  try {
    const session = await requireFamily();
    const {
      type,
      answer,
      kidId,
      timezone = "America/Los_Angeles",
    } = await req.json();

    // Validate type
    if (type !== "addition" && type !== "subtraction") {
      return NextResponse.json(
        { error: "type must be 'addition' or 'subtraction'" },
        { status: 400 }
      );
    }

    if (typeof answer !== "number") {
      return NextResponse.json(
        { error: "answer must be a number" },
        { status: 400 }
      );
    }

    // Determine target kid ID
    let targetKidId = session.user.id;

    if (session.user.role === "PARENT" && kidId) {
      const kid = await prisma.user.findUnique({
        where: { id: kidId },
      });
      if (!kid || kid.familyId !== session.user.familyId || kid.role !== "KID") {
        return NextResponse.json({ error: "Invalid kid" }, { status: 400 });
      }
      targetKidId = kidId;
    } else if (session.user.role !== "KID") {
      return NextResponse.json(
        { error: "kidId is required for parents" },
        { status: 400 }
      );
    }

    // Get today's date in user's timezone
    const todayStr = getLocalDateString(new Date(), timezone);

    // Generate today's problems
    const problems = generateDailyMathProblems(todayStr, targetKidId);
    const expectedAnswer =
      type === "addition" ? problems.addition.answer : problems.subtraction.answer;

    // Check if correct
    const isCorrect = answer === expectedAnswer;

    if (!isCorrect) {
      return NextResponse.json({
        correct: false,
        pointAwarded: false,
      });
    }

    // Get or create progress record
    const existingProgress = await prisma.mathProgress.findUnique({
      where: {
        kidId_date: {
          kidId: targetKidId,
          date: todayStr,
        },
      },
    });

    // Check if already completed this type today
    if (type === "addition" && existingProgress?.additionPassedAt) {
      return NextResponse.json({
        correct: true,
        pointAwarded: false,
        message: "alreadyCompleted",
      });
    }
    if (type === "subtraction" && existingProgress?.subtractionPassedAt) {
      return NextResponse.json({
        correct: true,
        pointAwarded: false,
        message: "alreadyCompleted",
      });
    }

    // Update progress
    const updateData =
      type === "addition"
        ? { additionPassedAt: new Date() }
        : { subtractionPassedAt: new Date() };

    const updatedProgress = await prisma.mathProgress.upsert({
      where: {
        kidId_date: {
          kidId: targetKidId,
          date: todayStr,
        },
      },
      create: {
        kidId: targetKidId,
        date: todayStr,
        ...updateData,
      },
      update: updateData,
    });

    // Check if both are now complete and point not yet awarded
    const bothComplete =
      updatedProgress.additionPassedAt && updatedProgress.subtractionPassedAt;
    let pointAwarded = false;

    if (bothComplete && !updatedProgress.pointAwarded) {
      // Award point
      await prisma.$transaction([
        prisma.mathProgress.update({
          where: { id: updatedProgress.id },
          data: { pointAwarded: true },
        }),
        prisma.pointEntry.create({
          data: {
            familyId: session.user.familyId!,
            kidId: targetKidId,
            points: 1,
            note: "Math: daily practice",
            createdById: session.user.id,
            updatedById: session.user.id,
          },
        }),
      ]);
      pointAwarded = true;
    }

    return NextResponse.json({
      correct: true,
      pointAwarded,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Something went wrong" },
      { status: 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/math/submit/route.ts
git commit -m "feat(learn): add POST /api/math/submit endpoint"
```

---

## Task 5: Add Localization Keys

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

**Step 1: Update en.json learn section**

Find the `"learn"` section (around line 514) and replace with:

```json
  "learn": {
    "pageTitle": "Learning Center",
    "pageDesc": "Daily sight words and math practice",
    "todaysWord": "Today's Word",
    "takeQuiz": "Take Quiz",
    "alreadyCompleted": "Done for today! Come back tomorrow.",
    "spellTheWord": "Spell the Word",
    "typeAnswer": "Type your answer...",
    "submit": "Check",
    "correct": "Correct!",
    "incorrect": "Try again!",
    "progress": "Progress",
    "wordsLearned": "{count} of {total} words learned",
    "allComplete": "Amazing! You've learned all the words!",
    "noWordsYet": "No words to learn yet",
    "back": "Back",
    "sightWord": "Sight Word",
    "math": "Math",
    "mathLocked": "Complete sight word first",
    "addition": "Addition",
    "subtraction": "Subtraction",
    "typeMathAnswer": "Type your answer",
    "allDoneToday": "All done for today!",
    "mathComplete": "Math complete!",
    "todaysProgress": "Today's Progress",
    "pointEarned": "+1 point earned!",
    "step": "Step",
    "of": "of"
  },
```

**Step 2: Update zh.json learn section**

Find the `"learn"` section (around line 514) and replace with:

```json
  "learn": {
    "pageTitle": "学习中心",
    "pageDesc": "每日单词和数学练习",
    "todaysWord": "今天的单词",
    "takeQuiz": "开始测验",
    "alreadyCompleted": "今天完成了！明天再来。",
    "spellTheWord": "拼写这个单词",
    "typeAnswer": "输入你的答案...",
    "submit": "检查",
    "correct": "正确！",
    "incorrect": "再试一次！",
    "progress": "进度",
    "wordsLearned": "已学习 {count}/{total} 个单词",
    "allComplete": "太棒了！你已经学完所有单词了！",
    "noWordsYet": "还没有要学习的单词",
    "back": "返回",
    "sightWord": "单词",
    "math": "数学",
    "mathLocked": "先完成单词练习",
    "addition": "加法",
    "subtraction": "减法",
    "typeMathAnswer": "输入答案",
    "allDoneToday": "今天全部完成了！",
    "mathComplete": "数学完成！",
    "todaysProgress": "今日进度",
    "pointEarned": "+1 分！",
    "step": "步骤",
    "of": "/"
  },
```

**Step 3: Commit**

```bash
git add src/locales/en.json src/locales/zh.json
git commit -m "feat(learn): add math and learning center localization keys"
```

---

## Task 6: Create ProgressIndicator Component

**Files:**
- Create: `src/components/learn/ProgressIndicator.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useTranslations } from "next-intl";

type Props = {
  sightWordComplete: boolean;
  mathComplete: boolean;
};

export default function ProgressIndicator({
  sightWordComplete,
  mathComplete,
}: Props) {
  const t = useTranslations("learn");

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {/* Step 1: Sight Word */}
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            sightWordComplete
              ? "bg-green-500 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          {sightWordComplete ? "✓" : "1"}
        </div>
        <span
          className={`text-sm font-medium ${
            sightWordComplete ? "text-green-600" : "text-gray-700"
          }`}
        >
          {t("sightWord")}
        </span>
      </div>

      {/* Connector */}
      <div
        className={`w-8 h-1 rounded ${
          sightWordComplete ? "bg-green-500" : "bg-gray-300"
        }`}
      />

      {/* Step 2: Math */}
      <div className="flex items-center gap-2">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            mathComplete
              ? "bg-green-500 text-white"
              : sightWordComplete
              ? "bg-orange-500 text-white"
              : "bg-gray-300 text-gray-500"
          }`}
        >
          {mathComplete ? "✓" : "2"}
        </div>
        <span
          className={`text-sm font-medium ${
            mathComplete
              ? "text-green-600"
              : sightWordComplete
              ? "text-gray-700"
              : "text-gray-400"
          }`}
        >
          {t("math")}
        </span>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/learn/ProgressIndicator.tsx
git commit -m "feat(learn): add ProgressIndicator component"
```

---

## Task 7: Create MathModule Component

**Files:**
- Create: `src/components/learn/MathModule.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import confetti from "canvas-confetti";

type MathProblem = {
  a: number;
  b: number;
};

type MathData = {
  addition: MathProblem;
  subtraction: MathProblem;
  additionComplete: boolean;
  subtractionComplete: boolean;
  pointAwarded: boolean;
};

type Props = {
  kidId?: string;
  locked: boolean;
  onComplete: () => void;
};

export default function MathModule({ kidId, locked, onComplete }: Props) {
  const [data, setData] = useState<MathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    pointAwarded: boolean;
  } | null>(null);
  const [shake, setShake] = useState(false);
  const t = useTranslations("learn");

  // Current step: "addition" or "subtraction"
  const currentStep = data?.additionComplete ? "subtraction" : "addition";
  const bothComplete = data?.additionComplete && data?.subtractionComplete;

  useEffect(() => {
    if (!locked) {
      fetchMathData();
    }
  }, [locked, kidId]);

  const fetchMathData = async () => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams({ timezone });
      if (kidId) params.set("kidId", kidId);

      const response = await fetch(`/api/math/today?${params.toString()}`);
      const result = await response.json();
      if (response.ok) {
        setData(result);
        if (result.additionComplete && result.subtractionComplete) {
          onComplete();
        }
      }
    } catch (error) {
      console.error("Failed to fetch math data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || submitting || !answer.trim()) return;

    const numAnswer = parseInt(answer, 10);
    if (isNaN(numAnswer)) return;

    setSubmitting(true);
    setResult(null);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await fetch("/api/math/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: currentStep,
          answer: numAnswer,
          kidId,
          timezone,
        }),
      });

      const result = await response.json();
      setResult(result);

      if (result.correct) {
        // Update local state
        setData((prev) =>
          prev
            ? {
                ...prev,
                [currentStep === "addition"
                  ? "additionComplete"
                  : "subtractionComplete"]: true,
                pointAwarded: result.pointAwarded,
              }
            : null
        );
        setAnswer("");

        if (result.pointAwarded) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
          });
          onComplete();
        }
      } else {
        // Wrong answer - shake animation
        setShake(true);
        setTimeout(() => setShake(false), 500);
      }
    } catch (error) {
      console.error("Failed to submit answer:", error);
    } finally {
      setSubmitting(false);
    }
  };

  // Locked state
  if (locked) {
    return (
      <div className="text-center py-8">
        <div className="bg-gray-100 rounded-3xl p-8 opacity-60">
          <span className="text-6xl mb-4 block">🔒</span>
          <h2 className="text-xl font-bold text-gray-500">{t("math")}</h2>
          <p className="text-gray-400 mt-2">{t("mathLocked")}</p>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse">
          <div className="w-64 h-48 bg-gray-200 rounded-3xl" />
        </div>
      </div>
    );
  }

  // Both complete state
  if (bothComplete) {
    return (
      <div className="text-center py-8">
        <div className="bg-gradient-to-br from-green-400 to-teal-500 rounded-3xl p-8">
          <span className="text-6xl mb-4 block">🎉</span>
          <h2 className="text-2xl font-bold text-white">{t("mathComplete")}</h2>
          <p className="text-white/80 mt-2">{t("pointEarned")}</p>
        </div>
      </div>
    );
  }

  // Active problem state
  const problem =
    currentStep === "addition" ? data?.addition : data?.subtraction;
  const operator = currentStep === "addition" ? "+" : "−";
  const stepLabel = currentStep === "addition" ? t("addition") : t("subtraction");

  return (
    <div className="text-center">
      <h2 className="text-lg font-semibold text-gray-600 mb-4">{stepLabel}</h2>

      <div
        className={`bg-gradient-to-br from-orange-400 to-yellow-500 rounded-3xl p-8 shadow-2xl ${
          shake ? "animate-shake" : ""
        }`}
      >
        {/* Problem Display */}
        <div className="text-white mb-6">
          <span className="text-6xl sm:text-7xl font-bold tracking-wide">
            {problem?.a} {operator} {problem?.b} = ?
          </span>
        </div>

        {/* Result feedback */}
        {result && !result.correct && (
          <div className="mb-4 text-white/90 text-lg">{t("incorrect")}</div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            inputMode="numeric"
            pattern="[0-9]*"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder={t("typeMathAnswer")}
            className="w-full max-w-[200px] text-center text-4xl font-bold py-4 px-6 rounded-2xl border-4 border-white/30 bg-white/90 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-white mb-6"
            autoComplete="off"
            autoFocus
          />
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={submitting || !answer.trim()}
              className="bg-white text-orange-600 font-bold px-8 py-3 rounded-full shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {submitting ? "..." : t("submit")}
            </button>
          </div>
        </form>
      </div>

      {/* Step indicator */}
      <div className="mt-4 text-sm text-gray-500">
        {t("step")} {currentStep === "addition" ? "1" : "2"} {t("of")} 2
      </div>
    </div>
  );
}
```

**Step 2: Add shake animation to globals.css**

In `src/app/globals.css`, add at the end:

```css
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
  20%, 40%, 60%, 80% { transform: translateX(4px); }
}

.animate-shake {
  animation: shake 0.5s ease-in-out;
}
```

**Step 3: Commit**

```bash
git add src/components/learn/MathModule.tsx src/app/globals.css
git commit -m "feat(learn): add MathModule component"
```

---

## Task 8: Modify LearnView to Add onComplete Callback

**Files:**
- Modify: `src/components/learn/LearnView.tsx`

**Step 1: Add onComplete prop and callback**

At the top of the file, update the component signature and add a new prop:

Change line 20 from:
```tsx
export default function LearnView({ kidId }: { kidId?: string }) {
```

To:
```tsx
type Props = {
  kidId?: string;
  onComplete?: () => void;
};

export default function LearnView({ kidId, onComplete }: Props) {
```

**Step 2: Call onComplete when quiz is passed**

In the `handleSubmitQuiz` function, after the confetti call (around line 93), add a call to `onComplete`:

Find this block (around lines 87-104):
```tsx
      if (result.correct && result.pointAwarded) {
        // Celebrate!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        // Update the data to show completed
        setData((prev) =>
          prev
            ? {
                ...prev,
                alreadyCompletedToday: true,
                progress: { ...prev.progress, current: prev.progress.current + 1 },
              }
            : null
        );
      }
```

Change to:
```tsx
      if (result.correct && result.pointAwarded) {
        // Celebrate!
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        // Update the data to show completed
        setData((prev) =>
          prev
            ? {
                ...prev,
                alreadyCompletedToday: true,
                progress: { ...prev.progress, current: prev.progress.current + 1 },
              }
            : null
        );
        // Notify parent that sight word is complete
        onComplete?.();
      }
```

**Step 3: Also call onComplete when already completed on mount**

After the `useEffect` that calls `fetchTodaysWord`, add another effect to notify when already complete:

Add after line 50 (after the existing useEffect):
```tsx
  useEffect(() => {
    if (data?.alreadyCompletedToday) {
      onComplete?.();
    }
  }, [data?.alreadyCompletedToday, onComplete]);
```

**Step 4: Commit**

```bash
git add src/components/learn/LearnView.tsx
git commit -m "feat(learn): add onComplete callback to LearnView"
```

---

## Task 9: Create LearningCenter Component

**Files:**
- Create: `src/components/learn/LearningCenter.tsx`

**Step 1: Create the component**

```tsx
"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import LearnView from "./LearnView";
import MathModule from "./MathModule";
import ProgressIndicator from "./ProgressIndicator";

type Props = {
  kidId?: string;
};

export default function LearningCenter({ kidId }: Props) {
  const [sightWordComplete, setSightWordComplete] = useState(false);
  const [mathComplete, setMathComplete] = useState(false);
  const t = useTranslations("learn");

  const handleSightWordComplete = useCallback(() => {
    setSightWordComplete(true);
  }, []);

  const handleMathComplete = useCallback(() => {
    setMathComplete(true);
  }, []);

  const allComplete = sightWordComplete && mathComplete;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress Indicator */}
      <ProgressIndicator
        sightWordComplete={sightWordComplete}
        mathComplete={mathComplete}
      />

      {/* All Complete Celebration */}
      {allComplete ? (
        <div className="text-center py-16">
          <span className="text-8xl mb-4 block">🌟</span>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            {t("allDoneToday")}
          </h2>
          <p className="text-gray-500">Great job! Come back tomorrow.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Sight Word Module */}
          {!sightWordComplete && (
            <LearnView kidId={kidId} onComplete={handleSightWordComplete} />
          )}

          {/* Show completed sight word message when moving to math */}
          {sightWordComplete && !mathComplete && (
            <div className="text-center py-4">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
                <span>✓</span>
                <span className="font-medium">{t("sightWord")} {t("correct").toLowerCase()}</span>
              </div>
            </div>
          )}

          {/* Math Module */}
          <MathModule
            kidId={kidId}
            locked={!sightWordComplete}
            onComplete={handleMathComplete}
          />
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/learn/LearningCenter.tsx
git commit -m "feat(learn): add LearningCenter orchestration component"
```

---

## Task 10: Update Kid Learn Page

**Files:**
- Modify: `src/app/(kid)/learn/page.tsx`

**Step 1: Update to use LearningCenter**

Replace the entire file content with:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import LearningCenter from "@/components/learn/LearningCenter";

export default async function LearnPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  if (session.user.role === "PARENT") {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Learning Center</h1>
          <p className="text-gray-600 mt-1">Daily sight words and math practice</p>
        </div>
        <LearningCenter />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(kid)/learn/page.tsx
git commit -m "feat(learn): update kid learn page to use LearningCenter"
```

---

## Task 11: Update View-As Learn Page

**Files:**
- Modify: `src/app/(parent)/view-as/learn/ViewAsLearnClient.tsx`

**Step 1: Update to use LearningCenter**

Replace the entire file content with:

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useKidMode } from "@/components/providers/KidModeProvider";
import LearningCenter from "@/components/learn/LearningCenter";

export default function ViewAsLearnClient() {
  const { viewingAsKid, isKidMode } = useKidMode();
  const router = useRouter();

  useEffect(() => {
    if (!isKidMode) {
      router.push("/dashboard");
    }
  }, [isKidMode, router]);

  if (!viewingAsKid) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Learning Center</h1>
          <p className="text-gray-600 mt-1">
            Viewing as {viewingAsKid.name || viewingAsKid.email}
          </p>
        </div>
        <LearningCenter kidId={viewingAsKid.id} />
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(parent)/view-as/learn/ViewAsLearnClient.tsx
git commit -m "feat(learn): update view-as learn page to use LearningCenter"
```

---

## Task 12: Update Navigation - Rename Sight Words to Learn

**Files:**
- Modify: `src/components/MobileNav.tsx`

**Step 1: Update parent secondary links**

Find the `parentSecondaryLinks` array (around line 38-44) and change:

```tsx
  const parentSecondaryLinks = [
    { href: "/calendar", label: t("calendar"), icon: "📅" },
    { href: "/gallery", label: t("gallery"), icon: "📷" },
    { href: "/milestones", label: t("milestones"), icon: "🏆" },
    { href: "/sight-words", label: t("sightWords"), icon: "📚" },
    { href: "/settings", label: t("settings"), icon: "⚙️" },
  ];
```

To:

```tsx
  const parentSecondaryLinks = [
    { href: "/calendar", label: t("calendar"), icon: "📅" },
    { href: "/gallery", label: t("gallery"), icon: "📷" },
    { href: "/milestones", label: t("milestones"), icon: "🏆" },
    { href: "/sight-words", label: t("learn"), icon: "📚" },
    { href: "/settings", label: t("settings"), icon: "⚙️" },
  ];
```

**Step 2: Commit**

```bash
git add src/components/MobileNav.tsx
git commit -m "feat(nav): rename Sight Words to Learn in mobile nav"
```

---

## Task 13: Update Desktop Navigation

**Files:**
- Modify: `src/components/NavBar.tsx`

**Step 1: Update parent navigation link**

Find the sight-words link in the parent navigation section (around lines 190-197):

```tsx
                  <Link
                    href="/sight-words"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/sight-words" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("sightWords")}
                  </Link>
```

Change to:

```tsx
                  <Link
                    href="/sight-words"
                    className={`hover:text-gray-300 transition ${
                      pathname === "/sight-words" ? "text-blue-400" : ""
                    }`}
                  >
                    {t("learn")}
                  </Link>
```

**Step 2: Commit**

```bash
git add src/components/NavBar.tsx
git commit -m "feat(nav): rename Sight Words to Learn in desktop nav"
```

---

## Task 14: Manual Testing Checklist

**No code changes - testing only**

Run the development server and verify:

```bash
npm run dev
```

**Test as Kid:**
1. Log in as a kid account
2. Navigate to `/learn`
3. Verify progress indicator shows `[ ] Sight Word → [ ] Math`
4. Verify math is locked (grayed out with lock icon)
5. Complete sight word quiz
6. Verify progress updates to `[✓] Sight Word → [ ] Math`
7. Verify math unlocks with orange/yellow gradient
8. Complete addition problem
9. Verify subtraction problem appears
10. Complete subtraction problem
11. Verify confetti and +1 point message
12. Verify progress shows `[✓] Sight Word → [✓] Math`
13. Refresh page - verify "All done for today!" state

**Test as Parent (view-as):**
1. Log in as parent
2. Enable kid mode for a kid
3. Navigate to `/view-as/learn`
4. Verify same flow works

**Test Navigation:**
1. As parent, check desktop nav shows "Learn" not "Sight Words"
2. Check mobile nav (More menu) shows "Learn"

**Commit test verification:**

```bash
git add -A
git commit -m "test(learn): verify learning center implementation"
```

---

## Summary

This plan implements the Learning Center in 14 tasks:

1. **Database**: Add `MathProgress` model
2. **Utilities**: Create math problem generation
3. **API**: GET /api/math/today endpoint
4. **API**: POST /api/math/submit endpoint
5. **Localization**: Add English and Chinese translations
6. **Component**: ProgressIndicator
7. **Component**: MathModule
8. **Component**: LearnView modification (onComplete callback)
9. **Component**: LearningCenter orchestrator
10. **Page**: Update kid learn page
11. **Page**: Update view-as learn page
12. **Navigation**: Update MobileNav
13. **Navigation**: Update NavBar
14. **Testing**: Manual verification

Total estimated tasks: 14
