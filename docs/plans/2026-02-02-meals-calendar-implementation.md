# Meals Calendar Redesign - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the meals tab from dish-centric to day-centric, with a weekly calendar view, daily meal logging, bulk weekly planning, and on-demand AI feedback.

**Architecture:** Replace existing MealLog (single dish per log) with DailyMealLog (multiple meals per day). Replace existing WeeklyPlan (list of dishes) with new day-by-day structure. Keep existing Dish and WeeklyVote tables unchanged. New calendar UI replaces RecentMeals component.

**Tech Stack:** Next.js App Router, Prisma ORM, React components with next-intl i18n, Tailwind CSS, Anthropic Claude for AI feedback.

---

## Phase 1: Database Schema

### Task 1.1: Add New Prisma Models

**Files:**
- Modify: `prisma/schema.prisma`

**Step 1: Add the new models to schema.prisma**

Add after the existing `PlannedMeal` model (around line 589):

```prisma
model DailyMealLog {
  id          String   @id @default(cuid())
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)

  date        DateTime @db.Date
  notes       String?

  meals       DailyMeal[]
  dailyItems  DailyItem[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([familyId, date])
  @@index([familyId])
  @@index([familyId, date])
}

model DailyMeal {
  id            String   @id @default(cuid())
  dailyLogId    String
  dailyLog      DailyMealLog @relation(fields: [dailyLogId], references: [id], onDelete: Cascade)

  mealType      String   // "breakfast", "lunch", "dinner", "snack", or custom
  notes         String?

  dishes        DailyMealDish[]

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([dailyLogId])
}

model DailyMealDish {
  id          String   @id @default(cuid())
  mealId      String
  meal        DailyMeal @relation(fields: [mealId], references: [id], onDelete: Cascade)

  dishId      String?
  dish        Dish?    @relation(fields: [dishId], references: [id], onDelete: SetNull)
  dishName    String   // Always store name (from library or free-form)
  isFreeForm  Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([mealId])
  @@index([dishId])
}

model DailyItem {
  id          String   @id @default(cuid())
  dailyLogId  String
  dailyLog    DailyMealLog @relation(fields: [dailyLogId], references: [id], onDelete: Cascade)

  name        String   // e.g., "Apples", "Whole milk"

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([dailyLogId])
}

model MealPlan {
  id              String   @id @default(cuid())
  familyId        String
  family          Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)

  weekStart       DateTime @db.Date
  weeklyStaples   String[] @default([])
  aiRecommendation String?
  aiGeneratedAt   DateTime?

  createdById     String
  createdBy       User     @relation("MealPlanCreatedBy", fields: [createdById], references: [id])

  plannedDays     PlannedDay[]

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([familyId, weekStart])
  @@index([familyId])
}

model PlannedDay {
  id          String   @id @default(cuid())
  planId      String
  plan        MealPlan @relation(fields: [planId], references: [id], onDelete: Cascade)

  date        DateTime @db.Date

  meals       PlannedDayMeal[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([planId, date])
  @@index([planId])
}

model PlannedDayMeal {
  id          String   @id @default(cuid())
  dayId       String
  day         PlannedDay @relation(fields: [dayId], references: [id], onDelete: Cascade)

  mealType    String   // "breakfast", "lunch", "dinner", "snack"
  notes       String?

  dishes      PlannedDayMealDish[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([dayId])
}

model PlannedDayMealDish {
  id          String   @id @default(cuid())
  mealId      String
  meal        PlannedDayMeal @relation(fields: [mealId], references: [id], onDelete: Cascade)

  dishId      String?
  dish        Dish?    @relation(fields: [dishId], references: [id], onDelete: SetNull)
  dishName    String
  isFreeForm  Boolean  @default(false)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([mealId])
  @@index([dishId])
}
```

**Step 2: Update Family model relations**

In the `Family` model (around line 80), add:

```prisma
  dailyMealLogs  DailyMealLog[]
  mealPlans      MealPlan[]
```

**Step 3: Update User model relations**

In the `User` model (around line 68), add:

```prisma
  createdMealPlans  MealPlan[]  @relation("MealPlanCreatedBy")
```

**Step 4: Update Dish model relations**

In the `Dish` model (around line 497), add:

```prisma
  dailyMealDishes    DailyMealDish[]
  plannedDayMealDishes PlannedDayMealDish[]
```

**Step 5: Run migration**

Run: `npx prisma migrate dev --name add_daily_meal_calendar`

Expected: Migration succeeds, new tables created.

**Step 6: Generate Prisma client**

Run: `npx prisma generate`

Expected: Client regenerated with new models.

**Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/
git commit -m "feat(meals): add daily meal log and meal plan schemas"
```

---

## Phase 2: API Endpoints

### Task 2.1: Daily Meal Log API - GET

**Files:**
- Create: `src/app/api/daily-meals/route.ts`
- Create: `src/__tests__/api/daily-meals/daily-meals.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/api/daily-meals/daily-meals.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '../../helpers/api-test-utils'
import { Role } from '@prisma/client'

let mockSession: { user: { id: string; email: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (!mockSession.user.familyId) throw new Error('Forbidden: Must be part of a family')
    return mockSession
  }),
}))

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      dailyMealLog: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    }
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET } from '@/app/api/daily-meals/route'

describe('Daily Meals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/daily-meals', () => {
    it('should return 500 if not authenticated', async () => {
      const response = await GET(new Request('http://localhost/api/daily-meals?start=2026-02-01&end=2026-02-07'))
      const { status, data } = await parseResponse(response)

      expect(status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should return daily logs for date range', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.dailyMealLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          familyId: 'family-1',
          date: new Date('2026-02-03'),
          notes: null,
          meals: [
            {
              id: 'meal-1',
              mealType: 'dinner',
              notes: null,
              dishes: [
                { id: 'd-1', dishName: 'Kung Pao Chicken', isFreeForm: false, dish: { id: 'dish-1', name: 'Kung Pao Chicken', photoUrl: 'url' } }
              ]
            }
          ],
          dailyItems: [
            { id: 'item-1', name: 'Apples' }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const response = await GET(new Request('http://localhost/api/daily-meals?start=2026-02-01&end=2026-02-07'))
      const { status, data } = await parseResponse<{ logs: unknown[] }>(response)

      expect(status).toBe(200)
      expect(data.logs).toHaveLength(1)
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/api/daily-meals/daily-meals.test.ts`

Expected: FAIL - module not found

**Step 3: Write minimal implementation**

Create `src/app/api/daily-meals/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/daily-meals - Get daily meal logs for a date range
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const url = new URL(req.url);

    const startParam = url.searchParams.get("start");
    const endParam = url.searchParams.get("end");

    if (!startParam || !endParam) {
      return NextResponse.json(
        { error: "start and end date parameters are required" },
        { status: 400 }
      );
    }

    // Parse as local dates
    const start = new Date(`${startParam}T00:00:00`);
    const end = new Date(`${endParam}T23:59:59`);

    const logs = await prisma.dailyMealLog.findMany({
      where: {
        familyId: session.user.familyId!,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        meals: {
          include: {
            dishes: {
              include: {
                dish: {
                  select: { id: true, name: true, photoUrl: true },
                },
              },
            },
          },
        },
        dailyItems: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    return NextResponse.json({ logs });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/api/daily-meals/daily-meals.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/daily-meals/route.ts src/__tests__/api/daily-meals/daily-meals.test.ts
git commit -m "feat(meals): add GET /api/daily-meals endpoint"
```

---

### Task 2.2: Daily Meal Log API - POST (Upsert)

**Files:**
- Modify: `src/app/api/daily-meals/route.ts`
- Modify: `src/__tests__/api/daily-meals/daily-meals.test.ts`

**Step 1: Add test for POST**

Add to `src/__tests__/api/daily-meals/daily-meals.test.ts`:

```typescript
import { GET, POST } from '@/app/api/daily-meals/route'

// In the mock section, add:
vi.mock('@/lib/db', () => {
  return {
    prisma: {
      dailyMealLog: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        upsert: vi.fn(),
        delete: vi.fn(),
      },
      dailyMeal: {
        deleteMany: vi.fn(),
      },
      dailyItem: {
        deleteMany: vi.fn(),
      },
      dish: {
        findFirst: vi.fn(),
      },
      $transaction: vi.fn((fn) => fn({
        dailyMealLog: { upsert: vi.fn() },
        dailyMeal: { deleteMany: vi.fn() },
        dailyItem: { deleteMany: vi.fn() },
      })),
    }
  }
})

// Add new describe block:
describe('POST /api/daily-meals', () => {
  it('should create a daily log with meals', async () => {
    mockSession = {
      user: {
        id: 'user-1',
        email: 'test@example.com',
        role: Role.PARENT,
        familyId: 'family-1',
      },
    }

    mockPrisma.dailyMealLog.upsert.mockResolvedValue({
      id: 'log-1',
      familyId: 'family-1',
      date: new Date('2026-02-03'),
      notes: null,
      meals: [],
      dailyItems: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const request = createMockRequest('POST', {
      date: '2026-02-03',
      meals: [
        {
          mealType: 'dinner',
          dishes: [{ dishId: 'dish-1', dishName: 'Kung Pao Chicken' }],
        },
      ],
      dailyItems: ['Apples', 'Milk'],
    })

    const response = await POST(request)
    const { status, data } = await parseResponse<{ log: { id: string } }>(response)

    expect(status).toBe(200)
    expect(data.log).toBeDefined()
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/api/daily-meals/daily-meals.test.ts`

Expected: FAIL - POST not exported

**Step 3: Add POST implementation**

Add to `src/app/api/daily-meals/route.ts`:

```typescript
// POST /api/daily-meals - Create or update a daily meal log
export async function POST(req: Request) {
  try {
    const session = await requireFamily();
    const { date, meals, dailyItems, notes } = await req.json();

    if (!date) {
      return NextResponse.json(
        { error: "date is required" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(`${date}T12:00:00`);

    // Upsert the daily log with nested creates
    const log = await prisma.dailyMealLog.upsert({
      where: {
        familyId_date: {
          familyId: session.user.familyId!,
          date: parsedDate,
        },
      },
      update: {
        notes: notes || null,
        meals: {
          deleteMany: {},
          create: (meals || []).map((meal: { mealType: string; notes?: string; dishes: { dishId?: string; dishName: string; isFreeForm?: boolean }[] }) => ({
            mealType: meal.mealType,
            notes: meal.notes || null,
            dishes: {
              create: meal.dishes.map((dish) => ({
                dishId: dish.dishId || null,
                dishName: dish.dishName,
                isFreeForm: dish.isFreeForm ?? !dish.dishId,
              })),
            },
          })),
        },
        dailyItems: {
          deleteMany: {},
          create: (dailyItems || []).map((name: string) => ({ name })),
        },
      },
      create: {
        familyId: session.user.familyId!,
        date: parsedDate,
        notes: notes || null,
        meals: {
          create: (meals || []).map((meal: { mealType: string; notes?: string; dishes: { dishId?: string; dishName: string; isFreeForm?: boolean }[] }) => ({
            mealType: meal.mealType,
            notes: meal.notes || null,
            dishes: {
              create: meal.dishes.map((dish) => ({
                dishId: dish.dishId || null,
                dishName: dish.dishName,
                isFreeForm: dish.isFreeForm ?? !dish.dishId,
              })),
            },
          })),
        },
        dailyItems: {
          create: (dailyItems || []).map((name: string) => ({ name })),
        },
      },
      include: {
        meals: {
          include: {
            dishes: {
              include: {
                dish: {
                  select: { id: true, name: true, photoUrl: true },
                },
              },
            },
          },
        },
        dailyItems: true,
      },
    });

    return NextResponse.json({ log });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/api/daily-meals/daily-meals.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/daily-meals/route.ts src/__tests__/api/daily-meals/daily-meals.test.ts
git commit -m "feat(meals): add POST /api/daily-meals endpoint"
```

---

### Task 2.3: Meal Plans API - GET and POST

**Files:**
- Create: `src/app/api/meal-plans-v2/route.ts`
- Create: `src/__tests__/api/meal-plans-v2/meal-plans-v2.test.ts`

**Step 1: Write the failing test**

Create `src/__tests__/api/meal-plans-v2/meal-plans-v2.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '../../helpers/api-test-utils'
import { Role } from '@prisma/client'

let mockSession: { user: { id: string; email: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (!mockSession.user.familyId) throw new Error('Forbidden: Must be part of a family')
    return mockSession
  }),
}))

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      mealPlan: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    }
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET, POST } from '@/app/api/meal-plans-v2/route'

describe('Meal Plans V2 API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/meal-plans-v2', () => {
    it('should return plan for specified week', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.mealPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: ['Apples', 'Milk'],
        aiRecommendation: null,
        aiGeneratedAt: null,
        createdById: 'user-1',
        plannedDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const response = await GET(new Request('http://localhost/api/meal-plans-v2?week=2026-02-07'))
      const { status, data } = await parseResponse<{ plan: { id: string } }>(response)

      expect(status).toBe(200)
      expect(data.plan).toBeDefined()
    })
  })

  describe('POST /api/meal-plans-v2', () => {
    it('should reject non-parent users', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'kid@example.com',
          role: Role.KID,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', {
        weekStart: '2026-02-07',
        plannedDays: [],
        weeklyStaples: [],
      })

      const response = await POST(request)
      const { status } = await parseResponse(response)

      expect(status).toBe(403)
    })

    it('should create meal plan', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.mealPlan.upsert.mockResolvedValue({
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: ['Apples'],
        aiRecommendation: null,
        aiGeneratedAt: null,
        createdById: 'user-1',
        plannedDays: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', {
        weekStart: '2026-02-07',
        plannedDays: [
          {
            date: '2026-02-08',
            meals: [
              {
                mealType: 'dinner',
                dishes: [{ dishName: 'Pasta' }],
              },
            ],
          },
        ],
        weeklyStaples: ['Apples'],
      })

      const response = await POST(request)
      const { status, data } = await parseResponse<{ plan: { id: string } }>(response)

      expect(status).toBe(200)
      expect(data.plan).toBeDefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/api/meal-plans-v2/meal-plans-v2.test.ts`

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/app/api/meal-plans-v2/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { getWeekStart } from "@/lib/week-utils";

// GET /api/meal-plans-v2 - Get meal plan for a week
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const { searchParams } = new URL(req.url);

    const weekParam = searchParams.get("week");
    let weekStart: Date;

    if (weekParam) {
      weekStart = getWeekStart(new Date(`${weekParam}T12:00:00`));
    } else {
      // Default to next week
      const today = new Date();
      const thisWeekStart = getWeekStart(today);
      weekStart = new Date(thisWeekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }

    const plan = await prisma.mealPlan.findUnique({
      where: {
        familyId_weekStart: {
          familyId: session.user.familyId!,
          weekStart,
        },
      },
      include: {
        plannedDays: {
          include: {
            meals: {
              include: {
                dishes: {
                  include: {
                    dish: {
                      select: { id: true, name: true, photoUrl: true, ingredients: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            date: "asc",
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({
      plan,
      weekStart: weekStart.toISOString(),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

type PlannedDayInput = {
  date: string;
  meals: {
    mealType: string;
    notes?: string;
    dishes: {
      dishId?: string;
      dishName: string;
      isFreeForm?: boolean;
    }[];
  }[];
};

// POST /api/meal-plans-v2 - Create or update a meal plan
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can create meal plans" },
        { status: 403 }
      );
    }

    const { weekStart: weekStartParam, plannedDays, weeklyStaples } = await req.json();

    if (!weekStartParam) {
      return NextResponse.json(
        { error: "weekStart is required" },
        { status: 400 }
      );
    }

    const weekStart = getWeekStart(new Date(`${weekStartParam}T12:00:00`));

    const plan = await prisma.mealPlan.upsert({
      where: {
        familyId_weekStart: {
          familyId: session.user.familyId!,
          weekStart,
        },
      },
      update: {
        weeklyStaples: weeklyStaples || [],
        plannedDays: {
          deleteMany: {},
          create: (plannedDays || []).map((day: PlannedDayInput) => ({
            date: new Date(`${day.date}T12:00:00`),
            meals: {
              create: day.meals.map((meal) => ({
                mealType: meal.mealType,
                notes: meal.notes || null,
                dishes: {
                  create: meal.dishes.map((dish) => ({
                    dishId: dish.dishId || null,
                    dishName: dish.dishName,
                    isFreeForm: dish.isFreeForm ?? !dish.dishId,
                  })),
                },
              })),
            },
          })),
        },
      },
      create: {
        familyId: session.user.familyId!,
        weekStart,
        createdById: session.user.id,
        weeklyStaples: weeklyStaples || [],
        plannedDays: {
          create: (plannedDays || []).map((day: PlannedDayInput) => ({
            date: new Date(`${day.date}T12:00:00`),
            meals: {
              create: day.meals.map((meal) => ({
                mealType: meal.mealType,
                notes: meal.notes || null,
                dishes: {
                  create: meal.dishes.map((dish) => ({
                    dishId: dish.dishId || null,
                    dishName: dish.dishName,
                    isFreeForm: dish.isFreeForm ?? !dish.dishId,
                  })),
                },
              })),
            },
          })),
        },
      },
      include: {
        plannedDays: {
          include: {
            meals: {
              include: {
                dishes: {
                  include: {
                    dish: {
                      select: { id: true, name: true, photoUrl: true, ingredients: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: {
            date: "asc",
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ plan });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/api/meal-plans-v2/meal-plans-v2.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/meal-plans-v2/route.ts src/__tests__/api/meal-plans-v2/meal-plans-v2.test.ts
git commit -m "feat(meals): add meal plans v2 API with day-based planning"
```

---

### Task 2.4: AI Feedback API for Meal Plans

**Files:**
- Create: `src/app/api/meal-plans-v2/feedback/route.ts`

**Step 1: Write failing test**

Create `src/__tests__/api/meal-plans-v2/feedback.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '../../helpers/api-test-utils'
import { Role } from '@prisma/client'

let mockSession: { user: { id: string; email: string; role: Role; familyId: string | null } } | null = null

vi.mock('@/lib/permissions', () => ({
  requireFamily: vi.fn(() => {
    if (!mockSession) throw new Error('Unauthorized')
    if (!mockSession.user.familyId) throw new Error('Forbidden: Must be part of a family')
    return mockSession
  }),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    mealPlan: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: JSON.stringify({ summary: 'Good plan', suggestions: [] }) }],
      }),
    },
  })),
}))

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { POST } from '@/app/api/meal-plans-v2/feedback/route'

describe('Meal Plan Feedback API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('POST /api/meal-plans-v2/feedback', () => {
    it('should require parent role', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'kid@example.com',
          role: Role.KID,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status } = await parseResponse(response)

      expect(status).toBe(403)
    })

    it('should generate AI feedback for plan', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.mealPlan.findUnique.mockResolvedValue({
        id: 'plan-1',
        familyId: 'family-1',
        weekStart: new Date('2026-02-07'),
        weeklyStaples: ['Apples'],
        plannedDays: [
          {
            date: new Date('2026-02-08'),
            meals: [
              {
                mealType: 'dinner',
                dishes: [{ dishName: 'Pasta', dish: { ingredients: ['pasta', 'tomato'] } }],
              },
            ],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.mealPlan.update.mockResolvedValue({
        id: 'plan-1',
        aiRecommendation: '{"summary":"Good plan"}',
        aiGeneratedAt: new Date(),
      })

      const request = createMockRequest('POST', { planId: 'plan-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ feedback: object }>(response)

      expect(status).toBe(200)
      expect(data.feedback).toBeDefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/api/meal-plans-v2/feedback.test.ts`

Expected: FAIL - module not found

**Step 3: Write implementation**

Create `src/app/api/meal-plans-v2/feedback/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    if (session.user.role !== "PARENT") {
      return NextResponse.json(
        { error: "Only parents can request AI feedback" },
        { status: 403 }
      );
    }

    const { planId } = await req.json();

    if (!planId) {
      return NextResponse.json(
        { error: "planId is required" },
        { status: 400 }
      );
    }

    // Fetch the plan with all details
    const plan = await prisma.mealPlan.findUnique({
      where: { id: planId },
      include: {
        plannedDays: {
          include: {
            meals: {
              include: {
                dishes: {
                  include: {
                    dish: {
                      select: { name: true, ingredients: true },
                    },
                  },
                },
              },
            },
          },
          orderBy: { date: "asc" },
        },
      },
    });

    if (!plan || plan.familyId !== session.user.familyId) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Build meal summary for AI
    const mealSummary = plan.plannedDays.map((day) => {
      const dateStr = day.date.toLocaleDateString("en-US", { weekday: "long" });
      const meals = day.meals.map((meal) => {
        const dishes = meal.dishes.map((d) => {
          const ingredients = d.dish?.ingredients?.join(", ") || "unknown ingredients";
          return `${d.dishName} (${ingredients})`;
        });
        return `${meal.mealType}: ${dishes.join(", ")}`;
      });
      return `${dateStr}: ${meals.join("; ")}`;
    }).join("\n");

    const weeklyStaplesStr = plan.weeklyStaples.length > 0
      ? `Weekly staples (consumed daily): ${plan.weeklyStaples.join(", ")}`
      : "No weekly staples specified";

    const prompt = `Analyze this family's weekly meal plan for nutritional balance, variety, and kid-friendliness.

${mealSummary}

${weeklyStaplesStr}

Provide feedback in JSON format:
{
  "summary": "1-2 sentence overall assessment",
  "nutritionalBalance": [
    { "day": "Monday", "issue": "description", "suggestion": "what to add/change" }
  ],
  "variety": {
    "concerns": ["protein X appears too often"],
    "positives": ["good vegetable variety"]
  },
  "kidFriendly": [
    { "day": "Wednesday", "concern": "dish may be too spicy", "suggestion": "consider milder version" }
  ],
  "suggestions": ["top 2-3 actionable improvements"]
}

Be concise. Focus on practical suggestions.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const responseText = message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const feedbackJson = jsonMatch ? jsonMatch[0] : responseText;

    // Save feedback to plan
    await prisma.mealPlan.update({
      where: { id: planId },
      data: {
        aiRecommendation: feedbackJson,
        aiGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({ feedback: JSON.parse(feedbackJson) });
  } catch (error: unknown) {
    console.error("AI feedback error:", error);
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/api/meal-plans-v2/feedback.test.ts`

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/meal-plans-v2/feedback/route.ts src/__tests__/api/meal-plans-v2/feedback.test.ts
git commit -m "feat(meals): add AI feedback endpoint for meal plans"
```

---

## Phase 3: UI Components

### Task 3.1: Weekly Calendar Component

**Files:**
- Create: `src/components/meals/WeeklyCalendar.tsx`

**Step 1: Create the component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getWeekStart } from "@/lib/week-utils";

type DailyMealDish = {
  id: string;
  dishName: string;
  isFreeForm: boolean;
  dish?: { id: string; name: string; photoUrl: string } | null;
};

type DailyMeal = {
  id: string;
  mealType: string;
  notes: string | null;
  dishes: DailyMealDish[];
};

type DailyItem = {
  id: string;
  name: string;
};

type DailyLog = {
  id: string;
  date: string;
  notes: string | null;
  meals: DailyMeal[];
  dailyItems: DailyItem[];
};

type WeeklyCalendarProps = {
  onDayClick: (date: Date) => void;
  onPlanWeek: () => void;
};

export default function WeeklyCalendar({ onDayClick, onPlanWeek }: WeeklyCalendarProps) {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStart(new Date()));
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeekLogs();
  }, [currentWeekStart]);

  const fetchWeekLogs = async () => {
    setLoading(true);
    try {
      const start = currentWeekStart.toISOString().split("T")[0];
      const end = new Date(currentWeekStart);
      end.setDate(end.getDate() + 6);
      const endStr = end.toISOString().split("T")[0];

      const response = await fetch(`/api/daily-meals?start=${start}&end=${endStr}`);
      const data = await response.json();
      if (response.ok) {
        setLogs(data.logs);
      }
    } catch (err) {
      console.error("Failed to fetch week logs:", err);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: number) => {
    const newWeek = new Date(currentWeekStart);
    newWeek.setDate(newWeek.getDate() + direction * 7);
    setCurrentWeekStart(newWeek);
  };

  const goToToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  const getLogForDate = (date: Date): DailyLog | undefined => {
    const dateStr = date.toISOString().split("T")[0];
    return logs.find((log) => log.date.startsWith(dateStr));
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const formatWeekRange = () => {
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 6);
    const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${currentWeekStart.toLocaleDateString("en-US", opts)} - ${endDate.toLocaleDateString("en-US", opts)}, ${endDate.getFullYear()}`;
  };

  const dayNames = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateWeek(-1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <span className="font-medium">{formatWeekRange()}</span>
          <button
            onClick={() => navigateWeek(1)}
            className="p-2 hover:bg-gray-100 rounded"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToToday}
            className="ml-2 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            {t("today") || "Today"}
          </button>
        </div>
        <button
          onClick={onPlanWeek}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
        >
          {t("planNextWeek")}
        </button>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="p-8 text-center">{tCommon("loading")}</div>
      ) : (
        <div className="grid grid-cols-7 divide-x">
          {weekDays.map((date, i) => {
            const log = getLogForDate(date);
            const today = isToday(date);
            const past = isPast(date);

            return (
              <button
                key={i}
                onClick={() => onDayClick(date)}
                className={`p-2 min-h-[120px] text-left hover:bg-gray-50 transition-colors ${
                  today ? "bg-orange-50 ring-2 ring-orange-500 ring-inset" : ""
                }`}
              >
                <div className="text-xs text-gray-500">{dayNames[i]}</div>
                <div className={`text-lg font-medium ${today ? "text-orange-600" : ""}`}>
                  {date.getDate()}
                </div>

                {log ? (
                  <div className="mt-2 space-y-1">
                    {log.meals.map((meal) => (
                      <div
                        key={meal.id}
                        className={`text-xs p-1 rounded truncate ${
                          past ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {meal.mealType}: {meal.dishes.map((d) => d.dishName).join(", ")}
                      </div>
                    ))}
                    {log.dailyItems.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1">
                        {log.dailyItems.slice(0, 3).map((item) => (
                          <span key={item.id} className="text-xs">
                            {item.name.includes("apple") || item.name.toLowerCase().includes("fruit") ? "🍎" :
                             item.name.toLowerCase().includes("milk") ? "🥛" :
                             item.name.toLowerCase().includes("orange") ? "🍊" : "🥗"}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 text-center">
                    <span className="text-gray-300 text-2xl">+</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/meals/WeeklyCalendar.tsx
git commit -m "feat(meals): add WeeklyCalendar component"
```

---

### Task 3.2: Day Detail Modal Component

**Files:**
- Create: `src/components/meals/DayDetailModal.tsx`

**Step 1: Create the component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Dish = {
  id: string;
  name: string;
  photoUrl: string;
};

type DailyMealDish = {
  id: string;
  dishId: string | null;
  dishName: string;
  isFreeForm: boolean;
  dish?: Dish | null;
};

type DailyMeal = {
  id: string;
  mealType: string;
  notes: string | null;
  dishes: DailyMealDish[];
};

type DailyItem = {
  id: string;
  name: string;
};

type DailyLog = {
  id: string;
  date: string;
  notes: string | null;
  meals: DailyMeal[];
  dailyItems: DailyItem[];
};

type DayDetailModalProps = {
  date: Date;
  onClose: () => void;
  onSave: () => void;
};

export default function DayDetailModal({ date, onClose, onSave }: DayDetailModalProps) {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [log, setLog] = useState<DailyLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);

  // Form state
  const [meals, setMeals] = useState<{ mealType: string; dishes: { dishId?: string; dishName: string }[]; notes?: string }[]>([]);
  const [dailyItems, setDailyItems] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [newItemInput, setNewItemInput] = useState("");

  useEffect(() => {
    fetchData();
  }, [date]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split("T")[0];

      // Fetch existing log and dishes in parallel
      const [logRes, dishesRes] = await Promise.all([
        fetch(`/api/daily-meals?start=${dateStr}&end=${dateStr}`),
        fetch("/api/dishes"),
      ]);

      const logData = await logRes.json();
      const dishesData = await dishesRes.json();

      if (dishesRes.ok) {
        setDishes(dishesData.dishes);
      }

      if (logRes.ok && logData.logs.length > 0) {
        const existingLog = logData.logs[0];
        setLog(existingLog);
        setMeals(existingLog.meals.map((m: DailyMeal) => ({
          mealType: m.mealType,
          notes: m.notes || "",
          dishes: m.dishes.map((d: DailyMealDish) => ({
            dishId: d.dishId || undefined,
            dishName: d.dishName,
          })),
        })));
        setDailyItems(existingLog.dailyItems.map((i: DailyItem) => i.name));
        setNotes(existingLog.notes || "");
      } else {
        // Default empty state
        setMeals([]);
        setDailyItems([]);
        setNotes("");
      }
    } catch (err) {
      console.error("Failed to fetch day data:", err);
    } finally {
      setLoading(false);
    }
  };

  const addMeal = (mealType: string) => {
    setMeals([...meals, { mealType, dishes: [] }]);
  };

  const removeMeal = (index: number) => {
    setMeals(meals.filter((_, i) => i !== index));
  };

  const addDishToMeal = (mealIndex: number, dishId: string, dishName: string) => {
    const updated = [...meals];
    updated[mealIndex].dishes.push({ dishId, dishName });
    setMeals(updated);
  };

  const addFreeFormDish = (mealIndex: number, dishName: string) => {
    if (!dishName.trim()) return;
    const updated = [...meals];
    updated[mealIndex].dishes.push({ dishName: dishName.trim() });
    setMeals(updated);
  };

  const removeDishFromMeal = (mealIndex: number, dishIndex: number) => {
    const updated = [...meals];
    updated[mealIndex].dishes = updated[mealIndex].dishes.filter((_, i) => i !== dishIndex);
    setMeals(updated);
  };

  const addDailyItem = () => {
    if (!newItemInput.trim()) return;
    setDailyItems([...dailyItems, newItemInput.trim()]);
    setNewItemInput("");
  };

  const removeDailyItem = (index: number) => {
    setDailyItems(dailyItems.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dateStr = date.toISOString().split("T")[0];
      const response = await fetch("/api/daily-meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateStr,
          meals,
          dailyItems,
          notes: notes || null,
        }),
      });

      if (response.ok) {
        onSave();
        onClose();
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const mealTypeOptions = ["breakfast", "lunch", "dinner", "snack"];

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h2 className="text-lg font-bold">{formatDate(date)}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">{tCommon("loading")}</div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Meals Section */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">{t("mealType") || "Meals"}</h3>

              {meals.map((meal, mealIndex) => (
                <div key={mealIndex} className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium capitalize">{t(meal.mealType) || meal.mealType}</span>
                    <button
                      onClick={() => removeMeal(mealIndex)}
                      className="text-red-500 hover:text-red-700 text-sm"
                    >
                      {tCommon("delete")}
                    </button>
                  </div>

                  {/* Dishes in this meal */}
                  <div className="space-y-2 mb-2">
                    {meal.dishes.map((dish, dishIndex) => (
                      <div key={dishIndex} className="flex items-center gap-2 bg-white p-2 rounded">
                        <span className="flex-1">{dish.dishName}</span>
                        <button
                          onClick={() => removeDishFromMeal(mealIndex, dishIndex)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add dish */}
                  <div className="flex gap-2">
                    <select
                      className="flex-1 border rounded p-2 text-sm"
                      onChange={(e) => {
                        if (e.target.value) {
                          const dish = dishes.find((d) => d.id === e.target.value);
                          if (dish) addDishToMeal(mealIndex, dish.id, dish.name);
                          e.target.value = "";
                        }
                      }}
                      defaultValue=""
                    >
                      <option value="">{t("selectExisting") || "Select from library..."}</option>
                      {dishes.map((dish) => (
                        <option key={dish.id} value={dish.id}>{dish.name}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder={t("dishNamePlaceholder") || "Or type custom..."}
                      className="flex-1 border rounded p-2 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addFreeFormDish(mealIndex, e.currentTarget.value);
                          e.currentTarget.value = "";
                        }
                      }}
                    />
                  </div>
                </div>
              ))}

              {/* Add meal buttons */}
              <div className="flex flex-wrap gap-2">
                {mealTypeOptions
                  .filter((type) => !meals.some((m) => m.mealType === type))
                  .map((type) => (
                    <button
                      key={type}
                      onClick={() => addMeal(type)}
                      className="px-3 py-1 text-sm border border-dashed border-gray-300 rounded-lg hover:bg-gray-50 capitalize"
                    >
                      + {t(type) || type}
                    </button>
                  ))}
              </div>
            </div>

            {/* Daily Items Section */}
            <div>
              <h3 className="font-medium text-gray-900 mb-3">{t("dailyItems") || "Daily Items"}</h3>

              <div className="flex flex-wrap gap-2 mb-3">
                {dailyItems.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {item}
                    <button
                      onClick={() => removeDailyItem(index)}
                      className="hover:text-green-600"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  placeholder="Apples, Milk, Yogurt..."
                  className="flex-1 border rounded p-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addDailyItem();
                  }}
                />
                <button
                  onClick={addDailyItem}
                  className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  {tCommon("add")}
                </button>
              </div>
            </div>

            {/* Notes Section */}
            <div>
              <h3 className="font-medium text-gray-900 mb-2">{t("notes") || "Notes"}</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this day..."
                className="w-full border rounded p-2 text-sm"
                rows={2}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            {tCommon("cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? tCommon("saving") : tCommon("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/meals/DayDetailModal.tsx
git commit -m "feat(meals): add DayDetailModal component"
```

---

### Task 3.3: Bulk Planning Modal Component

**Files:**
- Create: `src/components/meals/BulkPlanningModal.tsx`

**Step 1: Create the component**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getWeekStart } from "@/lib/week-utils";

type Dish = {
  id: string;
  name: string;
  photoUrl: string;
  ingredients: string[];
};

type Vote = {
  dishId: string;
  voterName: string;
};

type BulkPlanningModalProps = {
  onClose: () => void;
  onSave: () => void;
};

type PlannedMeal = {
  mealType: string;
  dishes: { dishId?: string; dishName: string }[];
};

type PlannedDay = {
  date: string;
  meals: PlannedMeal[];
};

export default function BulkPlanningModal({ onClose, onSave }: BulkPlanningModalProps) {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [weeklyStaples, setWeeklyStaples] = useState<string[]>([]);
  const [newStaple, setNewStaple] = useState("");
  const [plannedDays, setPlannedDays] = useState<PlannedDay[]>([]);
  const [planId, setPlanId] = useState<string | null>(null);

  // AI Feedback state
  const [feedback, setFeedback] = useState<object | null>(null);
  const [fetchingFeedback, setFetchingFeedback] = useState(false);

  // Calculate next week start
  const today = new Date();
  const thisWeekStart = getWeekStart(today);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(nextWeekStart);
    date.setDate(date.getDate() + i);
    return date;
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const weekStr = nextWeekStart.toISOString().split("T")[0];

      const [dishesRes, votesRes, planRes] = await Promise.all([
        fetch("/api/dishes"),
        fetch(`/api/votes?week=${weekStr}`),
        fetch(`/api/meal-plans-v2?week=${weekStr}`),
      ]);

      const dishesData = await dishesRes.json();
      const votesData = await votesRes.json();
      const planData = await planRes.json();

      if (dishesRes.ok) {
        // Sort dishes by vote count
        const voteCounts = new Map<string, number>();
        if (votesRes.ok && votesData.votes) {
          votesData.votes.forEach((v: { dishId: string }) => {
            voteCounts.set(v.dishId, (voteCounts.get(v.dishId) || 0) + 1);
          });
          setVotes(votesData.votes.map((v: { dishId: string; voter: { name: string } }) => ({
            dishId: v.dishId,
            voterName: v.voter.name,
          })));
        }

        const sortedDishes = dishesData.dishes.sort((a: Dish, b: Dish) => {
          const aVotes = voteCounts.get(a.id) || 0;
          const bVotes = voteCounts.get(b.id) || 0;
          return bVotes - aVotes;
        });
        setDishes(sortedDishes);
      }

      // Load existing plan if any
      if (planRes.ok && planData.plan) {
        setPlanId(planData.plan.id);
        setWeeklyStaples(planData.plan.weeklyStaples || []);

        const existingDays = planData.plan.plannedDays.map((day: { date: string; meals: { mealType: string; dishes: { dishId?: string; dishName: string }[] }[] }) => ({
          date: day.date.split("T")[0],
          meals: day.meals.map((m) => ({
            mealType: m.mealType,
            dishes: m.dishes.map((d) => ({
              dishId: d.dishId,
              dishName: d.dishName,
            })),
          })),
        }));
        setPlannedDays(existingDays);

        if (planData.plan.aiRecommendation) {
          try {
            setFeedback(JSON.parse(planData.plan.aiRecommendation));
          } catch { /* ignore */ }
        }
      } else {
        // Initialize empty days
        setPlannedDays(weekDays.map((d) => ({
          date: d.toISOString().split("T")[0],
          meals: [],
        })));
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getVoteCount = (dishId: string): number => {
    return votes.filter((v) => v.dishId === dishId).length;
  };

  const getVoterNames = (dishId: string): string[] => {
    return votes.filter((v) => v.dishId === dishId).map((v) => v.voterName);
  };

  const addMealToDay = (dayIndex: number, mealType: string) => {
    const updated = [...plannedDays];
    updated[dayIndex].meals.push({ mealType, dishes: [] });
    setPlannedDays(updated);
  };

  const removeMealFromDay = (dayIndex: number, mealIndex: number) => {
    const updated = [...plannedDays];
    updated[dayIndex].meals = updated[dayIndex].meals.filter((_, i) => i !== mealIndex);
    setPlannedDays(updated);
  };

  const addDishToMeal = (dayIndex: number, mealIndex: number, dishId: string, dishName: string) => {
    const updated = [...plannedDays];
    updated[dayIndex].meals[mealIndex].dishes.push({ dishId, dishName });
    setPlannedDays(updated);
  };

  const removeDishFromMeal = (dayIndex: number, mealIndex: number, dishIndex: number) => {
    const updated = [...plannedDays];
    updated[dayIndex].meals[mealIndex].dishes = updated[dayIndex].meals[mealIndex].dishes.filter((_, i) => i !== dishIndex);
    setPlannedDays(updated);
  };

  const addStaple = () => {
    if (!newStaple.trim()) return;
    setWeeklyStaples([...weeklyStaples, newStaple.trim()]);
    setNewStaple("");
  };

  const removeStaple = (index: number) => {
    setWeeklyStaples(weeklyStaples.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const weekStr = nextWeekStart.toISOString().split("T")[0];
      const response = await fetch("/api/meal-plans-v2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weekStart: weekStr,
          plannedDays,
          weeklyStaples,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setPlanId(data.plan.id);
        onSave();
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleGetFeedback = async () => {
    if (!planId) {
      // Save first to get plan ID
      await handleSave();
    }

    setFetchingFeedback(true);
    try {
      const response = await fetch("/api/meal-plans-v2/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });

      if (response.ok) {
        const data = await response.json();
        setFeedback(data.feedback);
      }
    } catch (err) {
      console.error("Failed to get feedback:", err);
    } finally {
      setFetchingFeedback(false);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const dayNames = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold">{t("planNextWeek")}</h2>
            <p className="text-sm text-gray-500">
              {formatDate(nextWeekStart)} - {formatDate(weekDays[6])}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">{tCommon("loading")}</div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Days */}
            {weekDays.map((date, dayIndex) => {
              const day = plannedDays[dayIndex];

              return (
                <div key={dayIndex} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    {dayNames[dayIndex]}, {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </h3>

                  {day?.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="mb-3 p-3 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{t(meal.mealType) || meal.mealType}</span>
                        <button
                          onClick={() => removeMealFromDay(dayIndex, mealIndex)}
                          className="text-red-500 text-sm"
                        >
                          {tCommon("delete")}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-2">
                        {meal.dishes.map((dish, dishIndex) => (
                          <span
                            key={dishIndex}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-white border rounded text-sm"
                          >
                            {dish.dishName}
                            <button
                              onClick={() => removeDishFromMeal(dayIndex, mealIndex, dishIndex)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ))}
                      </div>

                      <select
                        className="w-full border rounded p-2 text-sm"
                        onChange={(e) => {
                          if (e.target.value) {
                            const dish = dishes.find((d) => d.id === e.target.value);
                            if (dish) addDishToMeal(dayIndex, mealIndex, dish.id, dish.name);
                            e.target.value = "";
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="">{t("selectExisting") || "Add dish..."}</option>
                        {dishes.map((dish) => {
                          const voteCount = getVoteCount(dish.id);
                          const voters = getVoterNames(dish.id);
                          return (
                            <option key={dish.id} value={dish.id}>
                              {dish.name} {voteCount > 0 ? `(${voteCount} votes: ${voters.join(", ")})` : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>
                  ))}

                  {/* Add meal button */}
                  {!day?.meals.some((m) => m.mealType === "dinner") && (
                    <button
                      onClick={() => addMealToDay(dayIndex, "dinner")}
                      className="text-sm text-orange-600 hover:text-orange-700"
                    >
                      + {t("dinner") || "Add Dinner"}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Weekly Staples */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-3">{t("weeklyStaples") || "Weekly Staples"}</h3>
              <p className="text-sm text-gray-500 mb-3">{t("weeklyStaplesDesc") || "Items consumed daily (fruits, dairy, etc.)"}</p>

              <div className="flex flex-wrap gap-2 mb-3">
                {weeklyStaples.map((item, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                  >
                    {item}
                    <button onClick={() => removeStaple(index)} className="hover:text-green-600">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newStaple}
                  onChange={(e) => setNewStaple(e.target.value)}
                  placeholder="Apples, Milk, Yogurt..."
                  className="flex-1 border rounded p-2 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addStaple();
                  }}
                />
                <button
                  onClick={addStaple}
                  className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                >
                  {tCommon("add")}
                </button>
              </div>
            </div>

            {/* AI Feedback Section */}
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-900">{t("healthFeedback")}</h3>
                <button
                  onClick={handleGetFeedback}
                  disabled={fetchingFeedback}
                  className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 text-sm"
                >
                  {fetchingFeedback ? t("analyzingMealPlan") : t("getFeedback")}
                </button>
              </div>

              {feedback && (
                <div className="bg-purple-50 rounded-lg p-4 text-sm space-y-3">
                  {(feedback as { summary?: string }).summary && (
                    <div>
                      <strong>{t("feedbackSummary")}:</strong> {(feedback as { summary: string }).summary}
                    </div>
                  )}
                  {(feedback as { suggestions?: string[] }).suggestions && (
                    <div>
                      <strong>{t("feedbackSuggestions")}:</strong>
                      <ul className="list-disc list-inside mt-1">
                        {(feedback as { suggestions: string[] }).suggestions.map((s, i) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            {tCommon("cancel")}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
          >
            {saving ? tCommon("saving") : t("savePlan")}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/meals/BulkPlanningModal.tsx
git commit -m "feat(meals): add BulkPlanningModal component"
```

---

### Task 3.4: Update Meals Page with Calendar View

**Files:**
- Modify: `src/app/(parent)/meals/page.tsx`
- Create: `src/components/meals/MealsCalendarView.tsx`

**Step 1: Create the new calendar view component**

Create `src/components/meals/MealsCalendarView.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import WeeklyCalendar from "./WeeklyCalendar";
import DayDetailModal from "./DayDetailModal";
import BulkPlanningModal from "./BulkPlanningModal";

type Tab = "calendar" | "dishes" | "groceries";

export default function MealsCalendarView() {
  const t = useTranslations("meals");

  const [activeTab, setActiveTab] = useState<Tab>("calendar");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
  };

  const handleDaySave = () => {
    setRefreshKey((k) => k + 1);
  };

  const handlePlanSave = () => {
    setRefreshKey((k) => k + 1);
    setShowPlanningModal(false);
  };

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b">
        <button
          onClick={() => setActiveTab("calendar")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === "calendar"
              ? "border-orange-500 text-orange-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          {t("calendar") || "Calendar"}
        </button>
        <Link
          href="/meals/vote"
          className="px-4 py-2 font-medium text-gray-500 hover:text-gray-700"
        >
          {t("vote")}
        </Link>
        <Link
          href="/meals/results"
          className="px-4 py-2 font-medium text-gray-500 hover:text-gray-700"
        >
          {t("results")}
        </Link>
      </div>

      {/* Calendar View */}
      {activeTab === "calendar" && (
        <WeeklyCalendar
          key={refreshKey}
          onDayClick={handleDayClick}
          onPlanWeek={() => setShowPlanningModal(true)}
        />
      )}

      {/* Day Detail Modal */}
      {selectedDate && (
        <DayDetailModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onSave={handleDaySave}
        />
      )}

      {/* Bulk Planning Modal */}
      {showPlanningModal && (
        <BulkPlanningModal
          onClose={() => setShowPlanningModal(false)}
          onSave={handlePlanSave}
        />
      )}
    </div>
  );
}
```

**Step 2: Update the meals page**

Replace `src/app/(parent)/meals/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import MealsPageHeader from "@/components/meals/MealsPageHeader";
import MealsCalendarView from "@/components/meals/MealsCalendarView";

export default async function MealsPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MealsPageHeader />
        <div className="mt-8">
          <MealsCalendarView />
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/meals/MealsCalendarView.tsx src/app/\(parent\)/meals/page.tsx
git commit -m "feat(meals): integrate calendar view into meals page"
```

---

## Phase 4: i18n Updates

### Task 4.1: Add New Translation Keys

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

**Step 1: Add English translations**

Add to the `meals` section in `src/locales/en.json`:

```json
"calendar": "Calendar",
"today": "Today",
"dailyItems": "Daily Items",
"notes": "Notes",
"weeklyStaples": "Weekly Staples",
"weeklyStaplesDesc": "Items consumed daily (fruits, dairy, etc.)",
"snack": "Snack",
"addMeal": "Add Meal",
"addDish": "Add Dish",
"planWeek": "Plan Week"
```

**Step 2: Add Chinese translations**

Add to the `meals` section in `src/locales/zh.json`:

```json
"calendar": "日历",
"today": "今天",
"dailyItems": "每日食品",
"notes": "备注",
"weeklyStaples": "每周必备",
"weeklyStaplesDesc": "每天消耗的食品（水果、奶制品等）",
"snack": "零食",
"addMeal": "添加餐次",
"addDish": "添加菜品",
"planWeek": "规划一周"
```

**Step 3: Commit**

```bash
git add src/locales/en.json src/locales/zh.json
git commit -m "feat(meals): add i18n translations for calendar features"
```

---

## Phase 5: Auto-Convert Logic

### Task 5.1: Create Auto-Convert Utility

**Files:**
- Create: `src/lib/meal-plan-convert.ts`

**Step 1: Create the utility**

```typescript
import { prisma } from "@/lib/db";

/**
 * Convert planned meals to daily logs for dates that have passed.
 * Called when the app loads or via cron.
 */
export async function autoConvertPlannedMeals(familyId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find all plans for this family
  const plans = await prisma.mealPlan.findMany({
    where: { familyId },
    include: {
      plannedDays: {
        where: {
          date: { lt: today },
        },
        include: {
          meals: {
            include: {
              dishes: true,
            },
          },
        },
      },
    },
  });

  for (const plan of plans) {
    for (const day of plan.plannedDays) {
      // Check if daily log already exists
      const existingLog = await prisma.dailyMealLog.findUnique({
        where: {
          familyId_date: {
            familyId,
            date: day.date,
          },
        },
      });

      if (!existingLog) {
        // Create daily log from planned day
        await prisma.dailyMealLog.create({
          data: {
            familyId,
            date: day.date,
            meals: {
              create: day.meals.map((meal) => ({
                mealType: meal.mealType,
                notes: meal.notes,
                dishes: {
                  create: meal.dishes.map((dish) => ({
                    dishId: dish.dishId,
                    dishName: dish.dishName,
                    isFreeForm: dish.isFreeForm,
                  })),
                },
              })),
            },
            // Add weekly staples as daily items
            dailyItems: {
              create: plan.weeklyStaples.map((name) => ({ name })),
            },
          },
        });
      }
    }
  }
}
```

**Step 2: Commit**

```bash
git add src/lib/meal-plan-convert.ts
git commit -m "feat(meals): add auto-convert utility for planned meals"
```

---

## Phase 6: Integration Testing

### Task 6.1: Run Full Test Suite

**Step 1: Run all tests**

Run: `npm test`

Expected: All tests pass

**Step 2: Manual testing checklist**

- [ ] Navigate to Meals tab, see weekly calendar
- [ ] Click on a day, open day detail modal
- [ ] Add a meal with dishes from library
- [ ] Add a meal with free-form text dish
- [ ] Add daily items
- [ ] Save and see calendar update
- [ ] Click "Plan Next Week"
- [ ] Add meals for multiple days
- [ ] Add weekly staples
- [ ] Save plan
- [ ] Click "Get AI Feedback" and see results
- [ ] Navigate to Vote tab (should still work)
- [ ] Navigate to Results tab (should still work)

**Step 3: Commit final changes**

```bash
git add -A
git commit -m "feat(meals): complete calendar-based meal tracking implementation"
```

---

## Summary

This implementation plan covers:

1. **Database Schema** (Task 1.1): New models for daily meal logs and day-based meal plans
2. **API Endpoints** (Tasks 2.1-2.4): CRUD for daily meals, meal plans, and AI feedback
3. **UI Components** (Tasks 3.1-3.4): Weekly calendar, day detail modal, bulk planning modal
4. **i18n** (Task 4.1): English and Chinese translations
5. **Auto-Convert** (Task 5.1): Utility to convert planned meals to logs
6. **Testing** (Task 6.1): Full test suite and manual verification

Total estimated tasks: 10 major tasks with ~40 individual steps.
