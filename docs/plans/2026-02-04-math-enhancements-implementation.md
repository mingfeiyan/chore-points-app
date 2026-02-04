# Math Learning Enhancements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add mistake tracking, AI insights, configurable difficulty, custom questions, and tab-based navigation to the Learning Center.

**Architecture:** Database-first approach - add new Prisma models, then build API routes, then UI. The Learning Center becomes tab-based (Sight Words | Math) with independent completion. Math module gets settings-driven question generation and logs every attempt for analytics.

**Tech Stack:** Next.js 16 App Router, Prisma, TypeScript, Tailwind CSS, Anthropic Claude API for insights

---

## Phase 1: Database Schema

### Task 1: Add MathAttempt Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add MathAttempt model to schema**

Add after the MathProgress model (around line 449):

```prisma
model MathAttempt {
  id             String   @id @default(cuid())
  kidId          String
  kid            User     @relation("KidMathAttempts", fields: [kidId], references: [id], onDelete: Cascade)
  questionType   String   // "addition", "subtraction", "multiplication", "division"
  question       String   // e.g., "12 + 7"
  correctAnswer  Int
  givenAnswer    Int
  isCorrect      Boolean
  responseTimeMs Int?
  source         String   // "daily" or "custom"
  createdAt      DateTime @default(now())

  @@index([kidId])
  @@index([kidId, createdAt])
  @@index([kidId, questionType])
}
```

**Step 2: Add relation to User model**

Find the User model and add after line 59 (`mathProgress`):

```prisma
  mathAttempts        MathAttempt[] @relation("KidMathAttempts")
```

**Step 3: Run migration**

Run: `npx prisma migrate dev --name add_math_attempt`

Expected: Migration created and applied successfully

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(db): add MathAttempt model for tracking answers"
```

---

### Task 2: Add MathSettings Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add MathSettings model**

Add after MathAttempt model:

```prisma
model MathSettings {
  id                    String  @id @default(cuid())
  familyId              String  @unique
  family                Family  @relation(fields: [familyId], references: [id], onDelete: Cascade)

  dailyQuestionCount    Int     @default(2)

  additionEnabled       Boolean @default(true)
  subtractionEnabled    Boolean @default(true)
  multiplicationEnabled Boolean @default(false)
  divisionEnabled       Boolean @default(false)

  additionMinA          Int     @default(1)
  additionMaxA          Int     @default(9)
  additionMinB          Int     @default(10)
  additionMaxB          Int     @default(99)
  allowCarrying         Boolean @default(true)

  subtractionMinA       Int     @default(10)
  subtractionMaxA       Int     @default(99)
  subtractionMinB       Int     @default(1)
  subtractionMaxB       Int     @default(9)
  allowBorrowing        Boolean @default(true)

  multiplicationMinA    Int     @default(1)
  multiplicationMaxA    Int     @default(10)
  multiplicationMinB    Int     @default(1)
  multiplicationMaxB    Int     @default(10)

  divisionMinDividend   Int     @default(1)
  divisionMaxDividend   Int     @default(100)
  divisionMinDivisor    Int     @default(1)
  divisionMaxDivisor    Int     @default(10)

  adaptiveDifficulty    Boolean @default(false)
  focusAreas            Json    @default("[]")

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

**Step 2: Add relation to Family model**

Find Family model and add after line 104 (`mealPlans`):

```prisma
  mathSettings   MathSettings?
```

**Step 3: Run migration**

Run: `npx prisma migrate dev --name add_math_settings`

Expected: Migration created and applied successfully

**Step 4: Commit**

```bash
git add prisma/
git commit -m "feat(db): add MathSettings model for configurable difficulty"
```

---

### Task 3: Add CustomMathQuestion Model

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add CustomMathQuestion model**

Add after MathSettings model:

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

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([familyId])
  @@index([familyId, isActive])
}
```

**Step 2: Add relations to User and Family models**

In User model, add after `mathAttempts`:

```prisma
  customMathQuestions CustomMathQuestion[] @relation("CustomMathQuestionCreatedBy")
```

In Family model, add after `mathSettings`:

```prisma
  customMathQuestions CustomMathQuestion[]
```

**Step 3: Run migration**

Run: `npx prisma migrate dev --name add_custom_math_question`

Expected: Migration created and applied successfully

**Step 4: Verify schema and commit**

Run: `npx prisma generate`

```bash
git add prisma/
git commit -m "feat(db): add CustomMathQuestion model for parent-created problems"
```

---

## Phase 2: Core API Routes

### Task 4: Create Math Settings API

**Files:**
- Create: `src/app/api/math/settings/route.ts`

**Step 1: Create settings route file**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/math/settings - Get family's math settings
export async function GET() {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    let settings = await prisma.mathSettings.findUnique({
      where: { familyId: session.user.familyId! },
    });

    // Return defaults if no settings exist
    if (!settings) {
      settings = {
        id: "",
        familyId: session.user.familyId!,
        dailyQuestionCount: 2,
        additionEnabled: true,
        subtractionEnabled: true,
        multiplicationEnabled: false,
        divisionEnabled: false,
        additionMinA: 1,
        additionMaxA: 9,
        additionMinB: 10,
        additionMaxB: 99,
        allowCarrying: true,
        subtractionMinA: 10,
        subtractionMaxA: 99,
        subtractionMinB: 1,
        subtractionMaxB: 9,
        allowBorrowing: true,
        multiplicationMinA: 1,
        multiplicationMaxA: 10,
        multiplicationMinB: 1,
        multiplicationMaxB: 10,
        divisionMinDividend: 1,
        divisionMaxDividend: 100,
        divisionMinDivisor: 1,
        divisionMaxDivisor: 10,
        adaptiveDifficulty: false,
        focusAreas: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 401 }
    );
  }
}

// PUT /api/math/settings - Update family's math settings
export async function PUT(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const data = await req.json();

    // Validate dailyQuestionCount
    if (data.dailyQuestionCount !== undefined) {
      const count = Number(data.dailyQuestionCount);
      if (isNaN(count) || count < 1 || count > 20) {
        return NextResponse.json(
          { error: "dailyQuestionCount must be between 1 and 20" },
          { status: 400 }
        );
      }
      data.dailyQuestionCount = count;
    }

    const settings = await prisma.mathSettings.upsert({
      where: { familyId: session.user.familyId! },
      create: {
        familyId: session.user.familyId!,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(settings);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
```

**Step 2: Test the route**

Run: `npm run dev` (in another terminal)

Test GET: `curl http://localhost:3000/api/math/settings` (should return 401 without auth)

**Step 3: Commit**

```bash
git add src/app/api/math/settings/
git commit -m "feat(api): add math settings GET/PUT endpoints"
```

---

### Task 5: Update Submit Route to Log Attempts

**Files:**
- Modify: `src/app/api/math/submit/route.ts`

**Step 1: Add attempt logging to submit route**

Replace the entire file:

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
      responseTimeMs,
      source = "daily",
    } = await req.json();

    // Validate type
    if (!["addition", "subtraction", "multiplication", "division"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid question type" },
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

    let expectedAnswer: number;
    let questionStr: string;

    if (type === "addition") {
      expectedAnswer = problems.addition.answer;
      questionStr = `${problems.addition.a} + ${problems.addition.b}`;
    } else if (type === "subtraction") {
      expectedAnswer = problems.subtraction.answer;
      questionStr = `${problems.subtraction.a} - ${problems.subtraction.b}`;
    } else {
      // For multiplication/division, we'll need settings-based generation
      // For now, return error as they're not yet implemented
      return NextResponse.json(
        { error: "Question type not yet supported" },
        { status: 400 }
      );
    }

    const isCorrect = answer === expectedAnswer;

    // Log the attempt
    await prisma.mathAttempt.create({
      data: {
        kidId: targetKidId,
        questionType: type,
        question: questionStr,
        correctAnswer: expectedAnswer,
        givenAnswer: answer,
        isCorrect,
        responseTimeMs: responseTimeMs ? Math.round(responseTimeMs) : null,
        source,
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
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Run tests**

Run: `npm test`

Expected: All existing tests pass

**Step 3: Commit**

```bash
git add src/app/api/math/submit/route.ts
git commit -m "feat(api): log math attempts for analytics"
```

---

### Task 6: Create Attempts API for Analytics

**Files:**
- Create: `src/app/api/math/attempts/route.ts`

**Step 1: Create attempts route**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/math/attempts - Get attempt history for analytics
export async function GET(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const type = searchParams.get("type");
    const incorrectOnly = searchParams.get("incorrectOnly") === "true";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 500);
    const offset = parseInt(searchParams.get("offset") || "0");

    // Build where clause
    const where: Record<string, unknown> = {
      kid: { familyId: session.user.familyId },
    };

    if (kidId) {
      where.kidId = kidId;
    }

    if (from || to) {
      where.createdAt = {};
      if (from) {
        (where.createdAt as Record<string, Date>).gte = new Date(from);
      }
      if (to) {
        (where.createdAt as Record<string, Date>).lte = new Date(to);
      }
    }

    if (type) {
      where.questionType = type;
    }

    if (incorrectOnly) {
      where.isCorrect = false;
    }

    const [attempts, total] = await Promise.all([
      prisma.mathAttempt.findMany({
        where,
        include: {
          kid: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.mathAttempt.count({ where }),
    ]);

    return NextResponse.json({
      attempts,
      total,
      limit,
      offset,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/math/attempts/
git commit -m "feat(api): add math attempts GET endpoint for analytics"
```

---

### Task 7: Create Stats API for Aggregated Analytics

**Files:**
- Create: `src/app/api/math/stats/route.ts`

**Step 1: Create stats route**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/math/stats - Get aggregated stats for a kid
export async function GET(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const kidId = searchParams.get("kidId");
    const days = parseInt(searchParams.get("days") || "30");

    if (!kidId) {
      return NextResponse.json({ error: "kidId required" }, { status: 400 });
    }

    // Verify kid belongs to family
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Kid not found" }, { status: 404 });
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all attempts in period
    const attempts = await prisma.mathAttempt.findMany({
      where: {
        kidId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate stats
    const total = attempts.length;
    const correct = attempts.filter((a) => a.isCorrect).length;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

    // Stats by type
    const byType: Record<string, { total: number; correct: number; accuracy: number }> = {};
    for (const attempt of attempts) {
      if (!byType[attempt.questionType]) {
        byType[attempt.questionType] = { total: 0, correct: 0, accuracy: 0 };
      }
      byType[attempt.questionType].total++;
      if (attempt.isCorrect) {
        byType[attempt.questionType].correct++;
      }
    }
    for (const type of Object.keys(byType)) {
      byType[type].accuracy = Math.round(
        (byType[type].correct / byType[type].total) * 100
      );
    }

    // Calculate streak (consecutive correct first attempts per day)
    const dailyProgress = await prisma.mathProgress.findMany({
      where: {
        kidId,
        pointAwarded: true,
      },
      orderBy: { date: "desc" },
      take: 30,
    });

    let streak = 0;
    const today = new Date().toISOString().split("T")[0];
    for (let i = 0; i < dailyProgress.length; i++) {
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i);
      const expected = expectedDate.toISOString().split("T")[0];
      if (dailyProgress[i].date === expected || (i === 0 && dailyProgress[i].date === today)) {
        streak++;
      } else {
        break;
      }
    }

    // Common mistakes (wrong answers)
    const wrongAttempts = attempts.filter((a) => !a.isCorrect);
    const mistakePatterns: Record<string, number> = {};
    for (const attempt of wrongAttempts) {
      const diff = attempt.givenAnswer - attempt.correctAnswer;
      const pattern = diff > 0 ? `+${diff}` : `${diff}`;
      mistakePatterns[pattern] = (mistakePatterns[pattern] || 0) + 1;
    }

    // Sort mistakes by frequency
    const topMistakes = Object.entries(mistakePatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));

    return NextResponse.json({
      total,
      correct,
      accuracy,
      byType,
      streak,
      topMistakes,
      period: { days, since: since.toISOString() },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/math/stats/
git commit -m "feat(api): add math stats endpoint for aggregated analytics"
```

---

### Task 8: Create AI Analyze API

**Files:**
- Create: `src/app/api/math/analyze/route.ts`

**Step 1: Create analyze route**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// POST /api/math/analyze - Get AI insights on mistake patterns
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { kidId } = await req.json();

    if (!kidId) {
      return NextResponse.json({ error: "kidId required" }, { status: 400 });
    }

    // Verify kid belongs to family
    const kid = await prisma.user.findUnique({
      where: { id: kidId },
    });

    if (!kid || kid.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Kid not found" }, { status: 404 });
    }

    // Get recent attempts (last 30 days, max 200)
    const since = new Date();
    since.setDate(since.getDate() - 30);

    const attempts = await prisma.mathAttempt.findMany({
      where: {
        kidId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    if (attempts.length < 5) {
      return NextResponse.json({
        insights: [
          {
            type: "info",
            message: "Not enough data yet. Complete more math problems to get personalized insights.",
          },
        ],
        suggestedFocusAreas: [],
      });
    }

    // Format attempts for AI
    const wrongAttempts = attempts.filter((a) => !a.isCorrect);
    const correctAttempts = attempts.filter((a) => a.isCorrect);

    const attemptsSummary = {
      total: attempts.length,
      correct: correctAttempts.length,
      wrong: wrongAttempts.length,
      accuracy: Math.round((correctAttempts.length / attempts.length) * 100),
      wrongAnswers: wrongAttempts.slice(0, 50).map((a) => ({
        question: a.question,
        given: a.givenAnswer,
        correct: a.correctAnswer,
        type: a.questionType,
      })),
      byType: {} as Record<string, { total: number; correct: number }>,
    };

    for (const a of attempts) {
      if (!attemptsSummary.byType[a.questionType]) {
        attemptsSummary.byType[a.questionType] = { total: 0, correct: 0 };
      }
      attemptsSummary.byType[a.questionType].total++;
      if (a.isCorrect) attemptsSummary.byType[a.questionType].correct++;
    }

    const prompt = `Analyze this child's math practice data and provide 3-5 actionable insights for parents.

Data:
${JSON.stringify(attemptsSummary, null, 2)}

Guidelines:
- Look for patterns in wrong answers (off by 1, digit reversal, carrying/borrowing errors, etc.)
- Identify strengths and weaknesses by question type
- Suggest specific focus areas
- Be encouraging but honest
- Keep each insight to 1-2 sentences
- Format as JSON: { "insights": [{"type": "strength"|"weakness"|"pattern"|"suggestion", "message": "..."}], "suggestedFocusAreas": ["addition-carrying", "subtraction-borrowing", etc.] }`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    // Parse AI response
    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type");
    }

    let result;
    try {
      // Extract JSON from response (may be wrapped in markdown)
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found");
      }
    } catch {
      // Fallback if parsing fails
      result = {
        insights: [{ type: "info", message: content.text.slice(0, 500) }],
        suggestedFocusAreas: [],
      };
    }

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("AI analysis error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/math/analyze/
git commit -m "feat(api): add AI-powered math insights endpoint"
```

---

### Task 9: Create Custom Questions API

**Files:**
- Create: `src/app/api/math/questions/route.ts`

**Step 1: Create questions route**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/math/questions - List custom questions
export async function GET(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const tag = searchParams.get("tag");
    const activeOnly = searchParams.get("activeOnly") !== "false";

    const where: Record<string, unknown> = {
      familyId: session.user.familyId,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    const questions = await prisma.customMathQuestion.findMany({
      where,
      include: {
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json({ questions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: message },
      { status: message.includes("Forbidden") ? 403 : 500 }
    );
  }
}

// POST /api/math/questions - Add custom question(s)
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const body = await req.json();

    // Support single question or array for bulk import
    const questionsInput = Array.isArray(body) ? body : [body];

    const created = [];
    for (const q of questionsInput) {
      if (!q.question || typeof q.answer !== "number") {
        continue; // Skip invalid entries in bulk import
      }

      const question = await prisma.customMathQuestion.create({
        data: {
          familyId: session.user.familyId!,
          createdById: session.user.id,
          question: q.question,
          answer: q.answer,
          questionType: q.questionType || "custom",
          tags: q.tags || [],
          isActive: q.isActive !== false,
          sortOrder: q.sortOrder || 0,
        },
      });
      created.push(question);
    }

    return NextResponse.json({
      questions: created,
      count: created.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/math/questions/
git commit -m "feat(api): add custom math questions GET/POST endpoints"
```

---

### Task 10: Create Custom Question Single-Item API

**Files:**
- Create: `src/app/api/math/questions/[id]/route.ts`

**Step 1: Create route for single question operations**

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PUT /api/math/questions/[id] - Update a question
export async function PUT(req: Request, context: RouteContext) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { id } = await context.params;
    const data = await req.json();

    // Verify question belongs to family
    const existing = await prisma.customMathQuestion.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    const question = await prisma.customMathQuestion.update({
      where: { id },
      data: {
        question: data.question,
        answer: data.answer,
        questionType: data.questionType,
        tags: data.tags,
        isActive: data.isActive,
        sortOrder: data.sortOrder,
      },
    });

    return NextResponse.json(question);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/math/questions/[id] - Delete a question
export async function DELETE(req: Request, context: RouteContext) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json({ error: "Parents only" }, { status: 403 });
    }

    const { id } = await context.params;

    // Verify question belongs to family
    const existing = await prisma.customMathQuestion.findUnique({
      where: { id },
    });

    if (!existing || existing.familyId !== session.user.familyId) {
      return NextResponse.json({ error: "Question not found" }, { status: 404 });
    }

    await prisma.customMathQuestion.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

**Step 2: Commit**

```bash
git add src/app/api/math/questions/
git commit -m "feat(api): add custom math questions PUT/DELETE endpoints"
```

---

## Phase 3: Kid-Facing UI Changes

### Task 11: Update LearningCenter with Tab Navigation

**Files:**
- Modify: `src/components/learn/LearningCenter.tsx`

**Step 1: Replace LearningCenter with tab-based version**

```typescript
"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import LearnView from "./LearnView";
import MathModule from "./MathModule";

type Props = {
  kidId?: string;
};

type Tab = "sightWords" | "math";

export default function LearningCenter({ kidId }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("sightWords");
  const [sightWordComplete, setSightWordComplete] = useState(false);
  const [mathComplete, setMathComplete] = useState(false);
  const t = useTranslations("learn");

  const handleSightWordComplete = useCallback(() => {
    setSightWordComplete(true);
  }, []);

  const handleMathComplete = useCallback(() => {
    setMathComplete(true);
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("sightWords")}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
            activeTab === "sightWords"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("sightWord")}
          {!sightWordComplete && (
            <span className="absolute top-2 right-4 w-2 h-2 bg-orange-500 rounded-full" />
          )}
          {sightWordComplete && (
            <span className="ml-2 text-green-500">✓</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("math")}
          className={`flex-1 py-3 px-4 text-center font-medium transition-colors relative ${
            activeTab === "math"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("math")}
          {!mathComplete && (
            <span className="absolute top-2 right-4 w-2 h-2 bg-orange-500 rounded-full" />
          )}
          {mathComplete && (
            <span className="ml-2 text-green-500">✓</span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "sightWords" && (
          <LearnView kidId={kidId} onComplete={handleSightWordComplete} />
        )}
        {activeTab === "math" && (
          <MathModule
            kidId={kidId}
            onComplete={handleMathComplete}
          />
        )}
      </div>

      {/* All Complete Message */}
      {sightWordComplete && mathComplete && (
        <div className="mt-8 text-center py-8 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-2xl">
          <span className="text-6xl mb-4 block">🌟</span>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            {t("allDoneToday")}
          </h2>
          <p className="text-gray-500">Great job! Come back tomorrow.</p>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/learn/LearningCenter.tsx
git commit -m "feat(ui): convert LearningCenter to tab-based navigation"
```

---

### Task 12: Update MathModule to Remove Locked State

**Files:**
- Modify: `src/components/learn/MathModule.tsx`

**Step 1: Update MathModule props and remove locked logic**

Replace the file with this updated version that removes the `locked` prop and adds response time tracking:

```typescript
"use client";

import { useEffect, useState, useRef } from "react";
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
  onComplete: () => void;
};

export default function MathModule({ kidId, onComplete }: Props) {
  const [data, setData] = useState<MathData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    correct: boolean;
    pointAwarded: boolean;
  } | null>(null);
  const [shake, setShake] = useState(false);
  const questionStartTime = useRef<number>(Date.now());
  const t = useTranslations("learn");

  // Current step: "addition" or "subtraction"
  const currentStep = data?.additionComplete ? "subtraction" : "addition";
  const bothComplete = data?.additionComplete && data?.subtractionComplete;

  useEffect(() => {
    fetchMathData();
  }, [kidId]);

  // Reset timer when moving to next question
  useEffect(() => {
    questionStartTime.current = Date.now();
  }, [currentStep]);

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

    const responseTimeMs = Date.now() - questionStartTime.current;
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
          responseTimeMs,
          source: "daily",
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
        questionStartTime.current = Date.now();

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

  // No data state (API error)
  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Failed to load math problems</div>
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
            className="w-full max-w-[240px] text-center text-4xl font-bold py-4 px-6 rounded-2xl border-4 border-white/30 bg-white/90 text-gray-800 placeholder:text-xl placeholder:font-normal placeholder-gray-400 focus:outline-none focus:border-white mb-6"
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

**Step 2: Run tests**

Run: `npm test`

Expected: All tests pass

**Step 3: Commit**

```bash
git add src/components/learn/MathModule.tsx
git commit -m "feat(ui): remove locked state from MathModule, add response time tracking"
```

---

## Phase 4: Parent Analytics UI

### Task 13: Create Analytics Page

**Files:**
- Create: `src/app/(parent)/learn/progress/page.tsx`

**Step 1: Create the progress page**

```typescript
import { redirect } from "next/navigation";
import { requireFamily } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import MathAnalytics from "@/components/learn/MathAnalytics";

export default async function MathProgressPage() {
  const session = await requireFamily();

  if (session.user.role !== "PARENT") {
    redirect("/");
  }

  // Get kids in family
  const kids = await prisma.user.findMany({
    where: {
      familyId: session.user.familyId!,
      role: "KID",
    },
    select: { id: true, name: true },
  });

  if (kids.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Math Progress</h1>
        <p className="text-gray-500">No kids in your family yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Math Progress</h1>
      <MathAnalytics kids={kids} defaultKidId={kids[0].id} />
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/\(parent\)/learn/progress/
git commit -m "feat(ui): add math progress analytics page"
```

---

### Task 14: Create MathAnalytics Component

**Files:**
- Create: `src/components/learn/MathAnalytics.tsx`

**Step 1: Create the analytics component**

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";

type Kid = { id: string; name: string | null };

type Stats = {
  total: number;
  correct: number;
  accuracy: number;
  byType: Record<string, { total: number; correct: number; accuracy: number }>;
  streak: number;
  topMistakes: { pattern: string; count: number }[];
  period: { days: number; since: string };
};

type Attempt = {
  id: string;
  questionType: string;
  question: string;
  correctAnswer: number;
  givenAnswer: number;
  isCorrect: boolean;
  createdAt: string;
};

type Insight = {
  type: "strength" | "weakness" | "pattern" | "suggestion" | "info";
  message: string;
};

type Props = {
  kids: Kid[];
  defaultKidId: string;
};

export default function MathAnalytics({ kids, defaultKidId }: Props) {
  const [selectedKidId, setSelectedKidId] = useState(defaultKidId);
  const [days, setDays] = useState(30);
  const [stats, setStats] = useState<Stats | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, attemptsRes] = await Promise.all([
        fetch(`/api/math/stats?kidId=${selectedKidId}&days=${days}`),
        fetch(`/api/math/attempts?kidId=${selectedKidId}&incorrectOnly=true&limit=50`),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (attemptsRes.ok) {
        const data = await attemptsRes.json();
        setAttempts(data.attempts);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedKidId, days]);

  useEffect(() => {
    fetchData();
    setInsights([]); // Clear insights when changing kid/period
  }, [fetchData]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/math/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kidId: selectedKidId }),
      });
      if (res.ok) {
        const data = await res.json();
        setInsights(data.insights || []);
      }
    } catch (error) {
      console.error("Failed to analyze:", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const selectedKid = kids.find((k) => k.id === selectedKidId);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kid
          </label>
          <select
            value={selectedKidId}
            onChange={(e) => setSelectedKidId(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            {kids.map((kid) => (
              <option key={kid.id} value={kid.id}>
                {kid.name || "Unnamed"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Period
          </label>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
        </div>
      ) : stats ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Total Questions</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Accuracy</div>
              <div className="text-2xl font-bold text-green-600">
                {stats.accuracy}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Current Streak</div>
              <div className="text-2xl font-bold text-orange-500">
                {stats.streak} days
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-4">
              <div className="text-sm text-gray-500">Correct</div>
              <div className="text-2xl font-bold">
                {stats.correct}/{stats.total}
              </div>
            </div>
          </div>

          {/* By Type */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Accuracy by Type</h3>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, data]) => (
                <div key={type} className="flex items-center gap-3">
                  <span className="w-24 capitalize">{type}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-indigo-500 h-4 rounded-full"
                      style={{ width: `${data.accuracy}%` }}
                    />
                  </div>
                  <span className="w-16 text-right">{data.accuracy}%</span>
                  <span className="w-20 text-right text-sm text-gray-500">
                    ({data.correct}/{data.total})
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">AI Insights</h3>
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                {analyzing ? "Analyzing..." : "Analyze Mistakes"}
              </button>
            </div>
            {insights.length > 0 ? (
              <ul className="space-y-2">
                {insights.map((insight, i) => (
                  <li
                    key={i}
                    className={`p-3 rounded-md ${
                      insight.type === "strength"
                        ? "bg-green-50 text-green-800"
                        : insight.type === "weakness"
                        ? "bg-red-50 text-red-800"
                        : insight.type === "pattern"
                        ? "bg-yellow-50 text-yellow-800"
                        : insight.type === "suggestion"
                        ? "bg-blue-50 text-blue-800"
                        : "bg-gray-50 text-gray-800"
                    }`}
                  >
                    {insight.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-500">
                Click &quot;Analyze Mistakes&quot; to get AI-powered insights about{" "}
                {selectedKid?.name || "your child"}&apos;s learning patterns.
              </p>
            )}
          </div>

          {/* Mistake Log */}
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-3">Recent Mistakes</h3>
            {attempts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Date</th>
                      <th className="text-left py-2">Question</th>
                      <th className="text-left py-2">Given</th>
                      <th className="text-left py-2">Correct</th>
                      <th className="text-left py-2">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((attempt) => (
                      <tr key={attempt.id} className="border-b">
                        <td className="py-2">
                          {new Date(attempt.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-2 font-mono">{attempt.question}</td>
                        <td className="py-2 text-red-600">
                          {attempt.givenAnswer}
                        </td>
                        <td className="py-2 text-green-600">
                          {attempt.correctAnswer}
                        </td>
                        <td className="py-2 capitalize">
                          {attempt.questionType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No mistakes recorded yet!</p>
            )}
          </div>
        </>
      ) : (
        <p className="text-gray-500">No data available.</p>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/learn/MathAnalytics.tsx
git commit -m "feat(ui): add MathAnalytics component with stats, insights, and mistake log"
```

---

### Task 15: Add Translations

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

**Step 1: Add English translations**

Find the `"learn"` section (around line 514) and update it:

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
    "sightWord": "Sight Words",
    "math": "Math",
    "mathLocked": "Complete sight word first",
    "addition": "Addition",
    "subtraction": "Subtraction",
    "multiplication": "Multiplication",
    "division": "Division",
    "typeMathAnswer": "Type your answer",
    "allDoneToday": "All done for today!",
    "mathComplete": "Math complete!",
    "todaysProgress": "Today's Progress",
    "pointEarned": "+1 point earned!",
    "step": "Step",
    "of": "of",
    "dailyPractice": "Daily Practice",
    "customPractice": "Custom Practice",
    "firstTryCorrect": "You got {count}/{total} on the first try!",
    "mathProgress": "Math Progress",
    "mathSettings": "Math Settings",
    "customQuestions": "Custom Questions",
    "analyzeBtn": "Analyze Mistakes",
    "analyzing": "Analyzing...",
    "noDataYet": "Not enough data yet",
    "totalQuestions": "Total Questions",
    "accuracy": "Accuracy",
    "currentStreak": "Current Streak",
    "days": "days",
    "accuracyByType": "Accuracy by Type",
    "aiInsights": "AI Insights",
    "recentMistakes": "Recent Mistakes",
    "noMistakes": "No mistakes recorded yet!",
    "question": "Question",
    "given": "Given",
    "correctAnswer": "Correct",
    "type": "Type",
    "date": "Date"
  },
```

**Step 2: Add Chinese translations**

Find the `"learn"` section in zh.json and update similarly:

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
    "multiplication": "乘法",
    "division": "除法",
    "typeMathAnswer": "输入答案",
    "allDoneToday": "今天全部完成了！",
    "mathComplete": "数学完成！",
    "todaysProgress": "今日进度",
    "pointEarned": "+1 分！",
    "step": "步骤",
    "of": "/",
    "dailyPractice": "每日练习",
    "customPractice": "自定义练习",
    "firstTryCorrect": "你第一次就答对了 {count}/{total} 题！",
    "mathProgress": "数学进度",
    "mathSettings": "数学设置",
    "customQuestions": "自定义题目",
    "analyzeBtn": "分析错误",
    "analyzing": "分析中...",
    "noDataYet": "还没有足够的数据",
    "totalQuestions": "题目总数",
    "accuracy": "正确率",
    "currentStreak": "当前连续",
    "days": "天",
    "accuracyByType": "各类型正确率",
    "aiInsights": "AI分析",
    "recentMistakes": "最近的错误",
    "noMistakes": "还没有错误记录！",
    "question": "题目",
    "given": "回答",
    "correctAnswer": "正确答案",
    "type": "类型",
    "date": "日期"
  },
```

**Step 3: Commit**

```bash
git add src/locales/
git commit -m "feat(i18n): add translations for math analytics"
```

---

### Task 16: Run Full Test Suite and Fix Issues

**Step 1: Run all tests**

Run: `npm test`

**Step 2: Fix any failing tests**

If tests fail, read the error messages and fix accordingly.

**Step 3: Run the dev server and manually test**

Run: `npm run dev`

Test the following flows:
1. Visit Learning Center as kid - verify tabs work
2. Complete math problems - verify attempts are logged
3. Visit /learn/progress as parent - verify analytics show

**Step 4: Final commit**

```bash
git add -A
git commit -m "test: verify all tests pass after math enhancements"
```

---

## Phase 5: Math Settings UI (Optional - can be done later)

### Task 17: Create Math Settings Page

**Files:**
- Create: `src/app/(parent)/learn/settings/page.tsx`
- Create: `src/components/learn/MathSettingsForm.tsx`

This task creates the parent-facing settings UI for configuring difficulty. Implementation follows the same patterns as the analytics page.

---

### Task 18: Create Custom Questions Manager

**Files:**
- Create: `src/app/(parent)/learn/questions/page.tsx`
- Create: `src/components/learn/CustomQuestionsList.tsx`
- Create: `src/components/learn/CustomQuestionForm.tsx`

This task creates the custom questions management UI. Implementation follows existing patterns like SightWordsList.

---

## Summary

**Phase 1 (Tasks 1-3):** Database schema changes - adds MathAttempt, MathSettings, CustomMathQuestion models

**Phase 2 (Tasks 4-10):** Core API routes - settings, attempts, stats, analyze, custom questions CRUD

**Phase 3 (Tasks 11-12):** Kid UI - tab-based navigation, response time tracking

**Phase 4 (Tasks 13-16):** Parent analytics UI - progress page with stats, AI insights, mistake log

**Phase 5 (Tasks 17-18):** Settings and custom questions UI (can be deferred)

Each task is independently committable with clear verification steps.
