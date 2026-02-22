# Custom Math Questions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow parents to schedule free-form math questions for a specific kid on a specific date, replacing auto-generated questions. Award 1 point per correct answer for both custom and auto questions.

**Architecture:** Extend existing `CustomMathQuestion` model with `scheduledDate` and `kidId` fields. Modify `/api/math/today` to check for custom questions first, falling back to auto-generation. Change point logic from 1-for-all to 1-per-correct-answer.

**Tech Stack:** Next.js 16 App Router, Prisma, PostgreSQL, TypeScript, Tailwind CSS, next-intl

---

### Task 1: Add `scheduledDate` and `kidId` to CustomMathQuestion schema

**Files:**
- Modify: `prisma/schema.prisma:522-542` (CustomMathQuestion model)

**Step 1: Update the Prisma schema**

Add two nullable fields and a new index to `CustomMathQuestion`:

```prisma
model CustomMathQuestion {
  id          String   @id @default(cuid())
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  createdById String
  createdBy   User     @relation("CustomMathQuestionCreatedBy", fields: [createdById], references: [id])

  question    String
  answer      Int
  questionType String
  tags        Json     @default("[]")

  isActive    Boolean  @default(true)
  sortOrder   Int      @default(0)

  scheduledDate String?  // "YYYY-MM-DD" — if set, this question appears on that date
  kidId         String?  // Which kid this is scheduled for
  kid           User?    @relation("CustomMathQuestionKid", fields: [kidId], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([familyId])
  @@index([familyId, isActive])
  @@index([familyId, kidId, scheduledDate])
}
```

Also add the reverse relation on `User`:

In the `User` model, add:
```prisma
  scheduledMathQuestions CustomMathQuestion[] @relation("CustomMathQuestionKid")
```

**Step 2: Run the migration**

Run: `npx prisma migrate dev --name add-scheduled-math-questions`

Expected: Migration succeeds, new columns `scheduledDate` and `kidId` added as nullable.

**Step 3: Regenerate Prisma client**

Run: `npx prisma generate`

Expected: Prisma client regenerated with new fields.

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat: add scheduledDate and kidId to CustomMathQuestion schema"
```

---

### Task 2: Update `/api/math/today` to serve custom questions

**Files:**
- Modify: `src/app/api/math/today/route.ts`

**Step 1: Modify GET handler to check for custom questions first**

Replace the current implementation with logic that:
1. Queries `CustomMathQuestion` for `familyId + kidId + scheduledDate == todayStr`
2. If found, returns those as the day's questions with `source: "custom"`
3. If not found, falls back to existing auto-generation with `source: "auto"`

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import {
  generateQuestionsWithSettings,
  getLocalDateString,
  Question,
} from "@/lib/math-utils";

export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const timezone = searchParams.get("timezone") || "America/Los_Angeles";

    const targetKidId =
      kidId || (session.user.role === "KID" ? session.user.id : null);

    if (!targetKidId) {
      return NextResponse.json(
        { error: "kidId parameter required for parents" },
        { status: 400 }
      );
    }

    const kid = await prisma.user.findUnique({
      where: { id: targetKidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Kid not found or not in your family" },
        { status: 404 }
      );
    }

    const todayStr = getLocalDateString(new Date(), timezone);

    // Check for custom scheduled questions first
    const customQuestions = await prisma.customMathQuestion.findMany({
      where: {
        familyId: session.user.familyId!,
        kidId: targetKidId,
        scheduledDate: todayStr,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    let questions: { index: number; type: string; question: string; a?: number; b?: number }[];
    let questionsTarget: number;
    let source: "custom" | "auto";

    if (customQuestions.length > 0) {
      // Use custom questions
      source = "custom";
      questionsTarget = customQuestions.length;
      questions = customQuestions.map((q, i) => ({
        index: i,
        type: q.questionType,
        question: q.question,
      }));
    } else {
      // Fall back to auto-generated
      source = "auto";
      const settings = await prisma.mathSettings.findUnique({
        where: { familyId: session.user.familyId! },
      });
      questionsTarget = settings?.dailyQuestionCount ?? 2;
      const generated = generateQuestionsWithSettings(todayStr, targetKidId, settings || {});
      questions = generated.map((q: Question) => ({
        index: q.index,
        type: q.type,
        a: q.a,
        b: q.b,
        question: q.question,
      }));
    }

    const progress = await prisma.mathProgress.findUnique({
      where: {
        kidId_date: {
          kidId: targetKidId,
          date: todayStr,
        },
      },
    });

    const questionsCompleted = progress?.questionsCompleted ?? 0;
    const allComplete = questionsCompleted >= questionsTarget;

    return NextResponse.json({
      questions,
      questionsCompleted,
      questionsTarget,
      allComplete,
      pointAwarded: progress?.pointAwarded ?? false,
      source,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 401 }
    );
  }
}
```

**Step 2: Verify the dev server starts without errors**

Run: `npx next build` (or `npm run dev` and check for TypeScript errors)

**Step 3: Commit**

```bash
git add src/app/api/math/today/route.ts
git commit -m "feat: serve custom scheduled questions in /api/math/today"
```

---

### Task 3: Update `/api/math/submit` for 1-point-per-correct-answer

**Files:**
- Modify: `src/app/api/math/submit/route.ts`

**Step 1: Modify POST handler**

Key changes:
1. Detect if today has custom questions (same query as today route)
2. For custom questions, look up the answer from the DB instead of generating it
3. Award 1 point per correct answer (create `PointEntry` immediately on each correct answer)
4. Still track `questionsCompleted` and set `pointAwarded = true` when all done (for streaks)

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import {
  generateQuestionsWithSettings,
  getLocalDateString,
} from "@/lib/math-utils";

export async function POST(req: Request) {
  try {
    const session = await requireFamily();
    const {
      questionIndex,
      answer,
      kidId,
      timezone = "America/Los_Angeles",
      responseTimeMs,
      source = "daily",
    } = await req.json();

    if (typeof questionIndex !== "number" || questionIndex < 0) {
      return NextResponse.json(
        { error: "questionIndex must be a non-negative number" },
        { status: 400 }
      );
    }

    if (typeof answer !== "number") {
      return NextResponse.json(
        { error: "answer must be a number" },
        { status: 400 }
      );
    }

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

    const todayStr = getLocalDateString(new Date(), timezone);

    // Check for custom scheduled questions
    const customQuestions = await prisma.customMathQuestion.findMany({
      where: {
        familyId: session.user.familyId!,
        kidId: targetKidId,
        scheduledDate: todayStr,
        isActive: true,
      },
      orderBy: { sortOrder: "asc" },
    });

    let expectedAnswer: number;
    let questionType: string;
    let questionText: string;
    let questionsTarget: number;
    let actualSource: string;

    if (customQuestions.length > 0) {
      // Custom questions mode
      if (questionIndex >= customQuestions.length) {
        return NextResponse.json(
          { error: "Invalid question index" },
          { status: 400 }
        );
      }
      const cq = customQuestions[questionIndex];
      expectedAnswer = cq.answer;
      questionType = cq.questionType;
      questionText = cq.question;
      questionsTarget = customQuestions.length;
      actualSource = "custom";
    } else {
      // Auto-generated mode
      const settings = await prisma.mathSettings.findUnique({
        where: { familyId: session.user.familyId! },
      });
      questionsTarget = settings?.dailyQuestionCount ?? 2;
      const questions = generateQuestionsWithSettings(todayStr, targetKidId, settings || {});

      if (questionIndex >= questions.length) {
        return NextResponse.json(
          { error: "Invalid question index" },
          { status: 400 }
        );
      }
      const q = questions[questionIndex];
      expectedAnswer = q.answer;
      questionType = q.type;
      questionText = q.question;
      actualSource = source;
    }

    const isCorrect = answer === expectedAnswer;

    // Log the attempt
    await prisma.mathAttempt.create({
      data: {
        kidId: targetKidId,
        questionType,
        question: questionText,
        correctAnswer: expectedAnswer,
        givenAnswer: answer,
        isCorrect,
        responseTimeMs: responseTimeMs ? Math.round(responseTimeMs) : null,
        source: actualSource,
      },
    });

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

    const currentCompleted = existingProgress?.questionsCompleted ?? 0;

    if (questionIndex < currentCompleted) {
      return NextResponse.json({
        correct: true,
        pointAwarded: false,
        message: "alreadyCompleted",
      });
    }

    if (questionIndex !== currentCompleted) {
      return NextResponse.json({
        correct: true,
        pointAwarded: false,
        message: "wrongOrder",
      });
    }

    // Update progress and award 1 point for this correct answer
    const newCompleted = currentCompleted + 1;
    const allComplete = newCompleted >= questionsTarget;

    const pointNote = customQuestions.length > 0
      ? "Math: custom question"
      : "Math: daily practice";

    // Award 1 point per correct answer + update progress
    const updatedProgress = await prisma.$transaction(async (tx) => {
      const progress = await tx.mathProgress.upsert({
        where: {
          kidId_date: {
            kidId: targetKidId,
            date: todayStr,
          },
        },
        create: {
          kidId: targetKidId,
          date: todayStr,
          questionsCompleted: 1,
          questionsTarget,
          pointAwarded: allComplete,
        },
        update: {
          questionsCompleted: newCompleted,
          questionsTarget,
          pointAwarded: allComplete ? true : undefined,
        },
      });

      // Award 1 point for this correct answer
      await tx.pointEntry.create({
        data: {
          familyId: session.user.familyId!,
          kidId: targetKidId,
          points: 1,
          note: pointNote,
          createdById: session.user.id,
          updatedById: session.user.id,
        },
      });

      return progress;
    });

    return NextResponse.json({
      correct: true,
      pointAwarded: true,
      questionsCompleted: updatedProgress.questionsCompleted,
      questionsTarget,
      allComplete,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/math/submit/route.ts
git commit -m "feat: award 1 point per correct answer, support custom questions in submit"
```

---

### Task 4: Update `/api/math/questions` to accept `scheduledDate` and `kidId`

**Files:**
- Modify: `src/app/api/math/questions/route.ts`

**Step 1: Update GET to accept date/kid filters**

Add `scheduledDate` and `kidId` query params to the existing GET handler:

```typescript
// In the GET handler, after existing filters:
const scheduledDate = searchParams.get("scheduledDate");
const kidIdParam = searchParams.get("kidId");

if (scheduledDate) {
  where.scheduledDate = scheduledDate;
}

if (kidIdParam) {
  where.kidId = kidIdParam;
}
```

**Step 2: Update POST to accept `scheduledDate` and `kidId`**

In the POST handler's data creation, add:

```typescript
scheduledDate: q.scheduledDate || null,
kidId: q.kidId || null,
```

Add validation: max 10 questions per kid per date. Before the creation loop:

```typescript
if (questionsInput[0]?.scheduledDate && questionsInput[0]?.kidId) {
  const existingCount = await prisma.customMathQuestion.count({
    where: {
      familyId: session.user.familyId!,
      kidId: questionsInput[0].kidId,
      scheduledDate: questionsInput[0].scheduledDate,
    },
  });
  if (existingCount + questionsInput.length > 10) {
    return NextResponse.json(
      { error: "Maximum 10 questions per kid per day" },
      { status: 400 }
    );
  }
}
```

**Step 3: Commit**

```bash
git add src/app/api/math/questions/route.ts
git commit -m "feat: add scheduledDate and kidId support to custom questions API"
```

---

### Task 5: Update `/api/math/questions/[id]` to support new fields

**Files:**
- Modify: `src/app/api/math/questions/[id]/route.ts`

**Step 1: Add `scheduledDate` and `kidId` to the PUT handler's update data**

In the `prisma.customMathQuestion.update` call, add:

```typescript
data: {
  question: data.question,
  answer: data.answer,
  questionType: data.questionType,
  tags: data.tags,
  isActive: data.isActive,
  sortOrder: data.sortOrder,
  scheduledDate: data.scheduledDate ?? undefined,
  kidId: data.kidId ?? undefined,
},
```

**Step 2: Commit**

```bash
git add src/app/api/math/questions/[id]/route.ts
git commit -m "feat: support scheduledDate and kidId in question update API"
```

---

### Task 6: Update `MathModule.tsx` for custom question display and per-question points

**Files:**
- Modify: `src/components/learn/MathModule.tsx`

**Step 1: Update types and display logic**

Key changes:
1. Add `source` to `MathData` type
2. When `source === "custom"`, display the question text as-is (instead of `A operator B = ?`)
3. Show "+1 point" feedback after each correct answer
4. Trigger confetti when all questions are complete (not just on pointAwarded)

Update the `Question` type to handle both structured and custom:

```typescript
type Question = {
  index: number;
  type: string;
  a?: number;
  b?: number;
  question: string;
};

type MathData = {
  questions: Question[];
  questionsCompleted: number;
  questionsTarget: number;
  allComplete: boolean;
  pointAwarded: boolean;
  source: "custom" | "auto";
};
```

Update the problem display section — replace the hardcoded `{currentQuestion.a} {operator} {currentQuestion.b} = ?` with:

```tsx
{data?.source === "custom" ? (
  <span className="text-4xl sm:text-5xl font-bold tracking-wide">
    {currentQuestion.question} = ?
  </span>
) : (
  <span className="text-6xl sm:text-7xl font-bold tracking-wide">
    {currentQuestion.a} {operator} {currentQuestion.b} = ?
  </span>
)}
```

Update the correct answer handling — show "+1 point" feedback and trigger confetti on `allComplete`:

```typescript
if (result.correct) {
  setData((prev) =>
    prev
      ? {
          ...prev,
          questionsCompleted: result.questionsCompleted ?? prev.questionsCompleted + 1,
          allComplete: result.allComplete ?? false,
          pointAwarded: result.pointAwarded,
        }
      : null
  );
  setAnswer("");
  questionStartTime.current = Date.now();

  if (result.allComplete) {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
    onComplete();
  }
}
```

Update the submit call to pass the source:

```typescript
body: JSON.stringify({
  questionIndex: currentIndex,
  answer: numAnswer,
  kidId,
  timezone,
  responseTimeMs,
  source: data?.source === "custom" ? "custom" : "daily",
}),
```

Update the "all complete" message to show total points earned:

```tsx
<p className="text-white/80 mt-2">
  +{data.questionsTarget} {data.questionsTarget === 1 ? "point" : "points"} earned!
</p>
```

**Step 2: Commit**

```bash
git add src/components/learn/MathModule.tsx
git commit -m "feat: display custom questions and show per-question point feedback"
```

---

### Task 7: Add i18n strings for custom question scheduling

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

**Step 1: Add new translation keys**

Add to the `learn` section of `en.json`:

```json
"scheduleQuestions": "Schedule Questions",
"scheduleQuestionsDesc": "Set custom questions for a specific day",
"selectDate": "Select Date",
"selectKid": "Select Kid",
"questionText": "Question",
"expectedAnswer": "Answer",
"addQuestion": "+ Add Question",
"removeQuestion": "Remove",
"maxQuestionsReached": "Maximum 10 questions per day",
"questionsScheduled": "Questions saved!",
"savingQuestions": "Saving...",
"saveQuestions": "Save Questions",
"noQuestionsScheduled": "No questions scheduled for this day",
"scheduledDays": "Scheduled Days",
"customQuestionsToday": "Today's questions were set by {name}",
"pointsEarnedCount": "+{count} {count, plural, one {point} other {points}} earned!",
"clearDay": "Clear Day"
```

Add corresponding Chinese translations to `zh.json`.

**Step 2: Commit**

```bash
git add src/locales/en.json src/locales/zh.json
git commit -m "feat: add i18n strings for custom math question scheduling"
```

---

### Task 8: Create `ScheduleMathQuestions` component

**Files:**
- Create: `src/components/learn/ScheduleMathQuestions.tsx`

**Step 1: Build the parent-facing scheduling form**

This component provides:
- Date picker (defaults to tomorrow)
- Kid selector dropdown
- Dynamic list of question rows (question text + numeric answer), up to 10
- Add/remove row buttons
- Loads existing questions for selected date+kid
- Save button that POSTs to `/api/math/questions`

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";

type Kid = {
  id: string;
  name: string | null;
};

type QuestionRow = {
  id?: string; // existing question ID for updates
  question: string;
  answer: string;
};

type Props = {
  kids: Kid[];
};

export default function ScheduleMathQuestions({ kids }: Props) {
  const t = useTranslations("learn");
  const tCommon = useTranslations("common");
  const [selectedKid, setSelectedKid] = useState(kids[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default to tomorrow
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [rows, setRows] = useState<QuestionRow[]>([{ question: "", answer: "" }]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingIds, setExistingIds] = useState<string[]>([]);

  const fetchExisting = useCallback(async () => {
    if (!selectedKid || !selectedDate) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        kidId: selectedKid,
        scheduledDate: selectedDate,
        activeOnly: "true",
      });
      const res = await fetch(`/api/math/questions?${params}`);
      const data = await res.json();
      if (data.questions?.length > 0) {
        setRows(data.questions.map((q: { id: string; question: string; answer: number }) => ({
          id: q.id,
          question: q.question,
          answer: String(q.answer),
        })));
        setExistingIds(data.questions.map((q: { id: string }) => q.id));
      } else {
        setRows([{ question: "", answer: "" }]);
        setExistingIds([]);
      }
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  }, [selectedKid, selectedDate, tCommon]);

  useEffect(() => {
    fetchExisting();
  }, [fetchExisting]);

  const addRow = () => {
    if (rows.length >= 10) return;
    setRows([...rows, { question: "", answer: "" }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: "question" | "answer", value: string) => {
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const handleSave = async () => {
    setError(null);
    setSaved(false);

    // Validate
    const validRows = rows.filter((r) => r.question.trim() && r.answer.trim());
    if (validRows.length === 0) {
      setError("Add at least one question");
      return;
    }

    for (const r of validRows) {
      if (isNaN(parseInt(r.answer))) {
        setError("All answers must be numbers");
        return;
      }
    }

    setSaving(true);

    try {
      // Delete existing questions for this date+kid first
      for (const id of existingIds) {
        await fetch(`/api/math/questions/${id}`, { method: "DELETE" });
      }

      // Create new questions
      const questions = validRows.map((r, i) => ({
        question: r.question.trim(),
        answer: parseInt(r.answer),
        questionType: "custom",
        scheduledDate: selectedDate,
        kidId: selectedKid,
        sortOrder: i,
      }));

      const res = await fetch("/api/math/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questions),
      });

      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
        await fetchExisting(); // Reload to get IDs
      } else {
        const data = await res.json();
        setError(data.error || tCommon("somethingWentWrong"));
      }
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    try {
      for (const id of existingIds) {
        await fetch(`/api/math/questions/${id}`, { method: "DELETE" });
      }
      setRows([{ question: "", answer: "" }]);
      setExistingIds([]);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError(tCommon("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{t("scheduleQuestions")}</h2>
        <p className="text-gray-600 mt-1">{t("scheduleQuestionsDesc")}</p>
      </div>

      {/* Date and Kid selectors */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectDate")}
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("selectKid")}
            </label>
            <select
              value={selectedKid}
              onChange={(e) => setSelectedKid(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {kids.map((kid) => (
                <option key={kid.id} value={kid.id}>
                  {kid.name || t("unnamed")}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Question rows */}
      {loading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          {rows.map((row, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-500 w-6">{i + 1}.</span>
              <input
                type="text"
                value={row.question}
                onChange={(e) => updateRow(i, "question", e.target.value)}
                placeholder={t("questionText")}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                type="number"
                value={row.answer}
                onChange={(e) => updateRow(i, "answer", e.target.value)}
                placeholder={t("expectedAnswer")}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              {rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  {t("removeQuestion")}
                </button>
              )}
            </div>
          ))}

          {rows.length < 10 && (
            <button
              type="button"
              onClick={addRow}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              {t("addQuestion")}
            </button>
          )}

          {rows.length >= 10 && (
            <p className="text-sm text-gray-500">{t("maxQuestionsReached")}</p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {saving ? t("savingQuestions") : t("saveQuestions")}
        </button>
        {existingIds.length > 0 && (
          <button
            onClick={handleClear}
            disabled={saving}
            className="px-6 py-3 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50 transition"
          >
            {t("clearDay")}
          </button>
        )}
        {saved && (
          <span className="text-green-600 font-medium">{t("questionsScheduled")}</span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/learn/ScheduleMathQuestions.tsx
git commit -m "feat: add ScheduleMathQuestions component for parent question scheduling"
```

---

### Task 9: Add the scheduling UI to the math settings page

**Files:**
- Modify: `src/app/(parent)/learn/settings/page.tsx`

**Step 1: Fetch kids list and render both components**

Update the settings page to fetch kids from the family and render the `ScheduleMathQuestions` component below the existing `MathSettingsForm`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import MathSettingsForm from "@/components/learn/MathSettingsForm";
import ScheduleMathQuestions from "@/components/learn/ScheduleMathQuestions";

export default async function MathSettingsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  if (session.user.role !== "PARENT") {
    redirect("/dashboard");
  }

  const kids = await prisma.user.findMany({
    where: {
      familyId: session.user.familyId,
      role: "KID",
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        <MathSettingsForm />
        {kids.length > 0 && (
          <ScheduleMathQuestions kids={kids} />
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/(parent)/learn/settings/page.tsx
git commit -m "feat: add question scheduling UI to math settings page"
```

---

### Task 10: Build and verify end-to-end

**Step 1: Run the build**

Run: `npm run build`

Expected: Build succeeds with no TypeScript errors.

**Step 2: Run existing tests**

Run: `npm run test:run`

Expected: All existing tests pass (the point logic change may need test updates if there are math submit tests).

**Step 3: Manual verification checklist**

1. Parent: Go to `/learn/settings`, see the scheduling section below existing settings
2. Parent: Select a date and kid, add 3 questions, save
3. Parent: Change date and come back — questions load correctly
4. Kid: On the scheduled date, see custom questions instead of auto-generated
5. Kid: Each correct answer awards 1 point
6. Kid: On a day with no custom questions, auto-generated questions appear
7. Kid: Auto-generated questions also award 1 point per correct answer

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: custom math question scheduling with per-question points"
```
