# Meal Voting Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a meal planning feature where family members log dishes and vote weekly on what to cook.

**Architecture:** Three new Prisma models (Dish, MealLog, WeeklyVote) with REST APIs following existing patterns. Client components fetch data and manage state. Weekly votes reset automatically based on Monday boundaries calculated in user's timezone.

**Tech Stack:** Next.js 16, Prisma 7, React 19, next-intl, Vercel Blob (existing upload infrastructure), Tailwind CSS 4

---

## Task 1: Add Prisma Schema Models

**Files:**
- Modify: `prisma/schema.prisma:447` (add after BadgeTemplate model)

**Step 1: Add the MealType enum and three new models**

Add to `prisma/schema.prisma` after the `BadgeTemplate` model:

```prisma
enum MealType {
  BREAKFAST
  LUNCH
  DINNER
}

model Dish {
  id          String   @id @default(cuid())
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)

  name        String
  photoUrl    String
  totalVotes  Int      @default(0)

  createdById String
  createdBy   User     @relation("DishCreatedBy", fields: [createdById], references: [id])

  mealLogs    MealLog[]
  weeklyVotes WeeklyVote[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([familyId])
  @@index([familyId, totalVotes])
}

model MealLog {
  id          String   @id @default(cuid())
  familyId    String
  family      Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)

  dishId      String
  dish        Dish     @relation(fields: [dishId], references: [id], onDelete: Cascade)

  mealType    MealType
  date        DateTime

  loggedById  String
  loggedBy    User     @relation("MealLoggedBy", fields: [loggedById], references: [id])

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([familyId])
  @@index([familyId, date])
  @@index([dishId])
}

model WeeklyVote {
  id                 String   @id @default(cuid())
  familyId           String
visafamily            Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)

  dishId             String?
  dish               Dish?    @relation(fields: [dishId], references: [id], onDelete: Cascade)

  suggestedDishName  String?

  voterId            String
  voter              User     @relation("VoteCastBy", fields: [voterId], references: [id])

  weekStart          DateTime

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([familyId, voterId, dishId, weekStart])
  @@unique([familyId, voterId, suggestedDishName, weekStart])
  @@index([familyId])
  @@index([familyId, weekStart])
  @@index([voterId])
}
```

**Step 2: Add relations to User model**

In `prisma/schema.prisma`, add these relations to the User model (after `updatedBadgeTemplates`):

```prisma
  createdDishes     Dish[]       @relation("DishCreatedBy")
  loggedMeals       MealLog[]    @relation("MealLoggedBy")
  weeklyVotes       WeeklyVote[] @relation("VoteCastBy")
```

**Step 3: Add relations to Family model**

In `prisma/schema.prisma`, add these relations to the Family model (after `badgeTemplates`):

```prisma
  dishes      Dish[]
  mealLogs    MealLog[]
  weeklyVotes WeeklyVote[]
```

**Step 4: Run migration**

```bash
cd /Users/mingfeiy/chore-points-app/.worktrees/meal-voting
npx prisma migrate dev --name add_meal_voting_models
```

Expected: Migration creates successfully, generates new Prisma client.

**Step 5: Verify schema**

```bash
npx prisma validate
```

Expected: "The schema at prisma/schema.prisma is valid"

**Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(meals): add Dish, MealLog, and WeeklyVote models"
```

---

## Task 2: Add i18n Translations

**Files:**
- Modify: `src/locales/en.json`
- Modify: `src/locales/zh.json`

**Step 1: Add meals translations to en.json**

Add after the `sightWords` section in `src/locales/en.json`:

```json
  "meals": {
    "pageTitle": "Meals",
    "pageDesc": "Log dishes and vote on what to cook this week",
    "recentDishes": "Recent Dishes",
    "logDish": "Log Dish",
    "vote": "Vote",
    "results": "Results",
    "noDishesYet": "No dishes logged yet",
    "logFirstDish": "Log your first dish to get started!",
    "dishName": "Dish Name",
    "dishNamePlaceholder": "e.g., Beef Stir Fry",
    "mealType": "Meal Type",
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
    "photo": "Photo",
    "photoRequired": "Photo required for new dishes",
    "photoOptional": "Photo optional for existing dishes",
    "date": "Date",
    "selectExisting": "Select existing dish",
    "orAddNew": "Or add a new dish",
    "searchDishes": "Search dishes...",
    "noMatchingDishes": "No matching dishes",
    "logging": "Logging...",
    "logMeal": "Log Meal",
    "votingTitle": "Vote for This Week",
    "votingDesc": "Pick dishes you'd like to eat this week",
    "suggestNew": "Suggest New Dish",
    "suggestPlaceholder": "What dish would you like to try?",
    "suggest": "Suggest",
    "voted": "Voted",
    "votes": "votes",
    "noVotesYet": "No votes yet - be the first!",
    "familyFavorites": "Family Favorites",
    "noFavoritesYet": "Dishes with 5+ votes appear here",
    "allDishes": "All Dishes",
    "resultsTitle": "This Week's Votes",
    "resultsDesc": "See what the family wants to eat",
    "suggestedDishes": "Suggested New Dishes",
    "noSuggestionsYet": "No new dish suggestions this week",
    "votedBy": "Voted by",
    "weekResets": "Week resets Monday",
    "manageMeals": "Plan family meals together"
  }
```

**Step 2: Add meals translations to zh.json**

Add the corresponding Chinese translations to `src/locales/zh.json`:

```json
  "meals": {
    "pageTitle": "餐食",
    "pageDesc": "记录菜肴并投票本周要做什么",
    "recentDishes": "最近的菜",
    "logDish": "记录菜肴",
    "vote": "投票",
    "results": "结果",
    "noDishesYet": "还没有记录的菜肴",
    "logFirstDish": "记录你的第一道菜开始吧！",
    "dishName": "菜名",
    "dishNamePlaceholder": "例如：牛肉炒饭",
    "mealType": "餐类",
    "breakfast": "早餐",
    "lunch": "午餐",
    "dinner": "晚餐",
    "photo": "照片",
    "photoRequired": "新菜需要照片",
    "photoOptional": "已有菜肴照片可选",
    "date": "日期",
    "selectExisting": "选择已有菜肴",
    "orAddNew": "或添加新菜",
    "searchDishes": "搜索菜肴...",
    "noMatchingDishes": "没有匹配的菜肴",
    "logging": "记录中...",
    "logMeal": "记录餐食",
    "votingTitle": "本周投票",
    "votingDesc": "选择你这周想吃的菜",
    "suggestNew": "建议新菜",
    "suggestPlaceholder": "你想尝试什么菜？",
    "suggest": "建议",
    "voted": "已投票",
    "votes": "票",
    "noVotesYet": "还没有投票 - 成为第一个！",
    "familyFavorites": "家庭最爱",
    "noFavoritesYet": "获得5+票的菜肴会显示在这里",
    "allDishes": "所有菜肴",
    "resultsTitle": "本周投票结果",
    "resultsDesc": "看看家人想吃什么",
    "suggestedDishes": "建议的新菜",
    "noSuggestionsYet": "本周没有新菜建议",
    "votedBy": "投票人",
    "weekResets": "每周一重置",
    "manageMeals": "一起计划家庭餐食"
  }
```

**Step 3: Add nav entry for meals**

In both `en.json` and `zh.json`, add to the `nav` section:

English (`en.json`):
```json
"meals": "Meals"
```

Chinese (`zh.json`):
```json
"meals": "餐食"
```

**Step 4: Commit**

```bash
git add src/locales/en.json src/locales/zh.json
git commit -m "feat(meals): add i18n translations for meal voting"
```

---

## Task 3: Create Week Utility Functions

**Files:**
- Create: `src/lib/week-utils.ts`
- Create: `src/__tests__/lib/week-utils.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/lib/week-utils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { getWeekStart, isSameWeek } from '@/lib/week-utils'

describe('week-utils', () => {
  describe('getWeekStart', () => {
    it('should return Monday 00:00:00 for a Wednesday', () => {
      // Wednesday Jan 29, 2026
      const date = new Date('2026-01-29T14:30:00')
      const weekStart = getWeekStart(date)

      expect(weekStart.getDay()).toBe(1) // Monday
      expect(weekStart.getHours()).toBe(0)
      expect(weekStart.getMinutes()).toBe(0)
      expect(weekStart.getSeconds()).toBe(0)
      expect(weekStart.getDate()).toBe(26) // Monday Jan 26
    })

    it('should return same day for a Monday', () => {
      // Monday Jan 26, 2026
      const date = new Date('2026-01-26T10:00:00')
      const weekStart = getWeekStart(date)

      expect(weekStart.getDay()).toBe(1)
      expect(weekStart.getDate()).toBe(26)
    })

    it('should return previous Monday for a Sunday', () => {
      // Sunday Feb 1, 2026
      const date = new Date('2026-02-01T23:59:59')
      const weekStart = getWeekStart(date)

      expect(weekStart.getDay()).toBe(1)
      expect(weekStart.getDate()).toBe(26) // Monday Jan 26
    })
  })

  describe('isSameWeek', () => {
    it('should return true for dates in the same week', () => {
      const monday = new Date('2026-01-26T00:00:00')
      const friday = new Date('2026-01-30T23:59:59')

      expect(isSameWeek(monday, friday)).toBe(true)
    })

    it('should return false for dates in different weeks', () => {
      const sunday = new Date('2026-01-25T23:59:59')
      const monday = new Date('2026-01-26T00:00:00')

      expect(isSameWeek(sunday, monday)).toBe(false)
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/lib/week-utils.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/lib/week-utils.ts`:

```typescript
/**
 * Get the Monday 00:00:00 of the week containing the given date.
 * Week starts on Monday (ISO week).
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  // getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want Monday as day 0, so: (day + 6) % 7 gives us days since Monday
  const daysSinceMonday = (day + 6) % 7
  d.setDate(d.getDate() - daysSinceMonday)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Check if two dates are in the same week (Monday to Sunday).
 */
export function isSameWeek(date1: Date, date2: Date): boolean {
  const week1 = getWeekStart(date1)
  const week2 = getWeekStart(date2)
  return week1.getTime() === week2.getTime()
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/lib/week-utils.test.ts
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add src/lib/week-utils.ts src/__tests__/lib/week-utils.test.ts
git commit -m "feat(meals): add week utility functions"
```

---

## Task 4: Create Dishes API Routes

**Files:**
- Create: `src/app/api/dishes/route.ts`
- Create: `src/__tests__/api/dishes/dishes.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/api/dishes/dishes.test.ts`:

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
      dish: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      mealLog: {
        create: vi.fn(),
      },
    }
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET, POST } from '@/app/api/dishes/route'

describe('Dishes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/dishes', () => {
    it('should return 500 if not authenticated', async () => {
      const response = await GET()
      const { status, data } = await parseResponse(response)

      expect(status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should return list of dishes for the family', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.dish.findMany.mockResolvedValue([
        {
          id: 'dish-1',
          name: 'Beef Stir Fry',
          photoUrl: 'https://example.com/beef.jpg',
          totalVotes: 3,
          familyId: 'family-1',
          createdById: 'user-1',
          createdBy: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const response = await GET()
      const { status, data } = await parseResponse<{ dishes: unknown[] }>(response)

      expect(status).toBe(200)
      expect(data.dishes).toHaveLength(1)
      expect(data.dishes[0]).toHaveProperty('name', 'Beef Stir Fry')
    })
  })

  describe('POST /api/dishes', () => {
    it('should return 400 if name is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { photoUrl: 'https://example.com/photo.jpg' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should return 400 if photoUrl is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { name: 'Test Dish' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should create dish successfully', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.dish.create.mockResolvedValue({
        id: 'new-dish-id',
        name: 'Chicken Curry',
        photoUrl: 'https://example.com/curry.jpg',
        totalVotes: 0,
        familyId: 'family-1',
        createdById: 'user-1',
        createdBy: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', {
        name: 'Chicken Curry',
        photoUrl: 'https://example.com/curry.jpg',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ dish: { id: string; name: string } }>(response)

      expect(status).toBe(201)
      expect(data.dish).toBeDefined()
      expect(data.dish.name).toBe('Chicken Curry')
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/api/dishes/dishes.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/app/api/dishes/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// GET /api/dishes - Get all dishes for the family
export async function GET() {
  try {
    const session = await requireFamily();

    const dishes = await prisma.dish.findMany({
      where: {
        familyId: session.user.familyId!,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ dishes });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/dishes - Create a new dish
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    const { name, photoUrl } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Name is required and must be a string" },
        { status: 400 }
      );
    }

    if (!photoUrl || typeof photoUrl !== "string") {
      return NextResponse.json(
        { error: "Photo URL is required" },
        { status: 400 }
      );
    }

    const dish = await prisma.dish.create({
      data: {
        name: name.trim(),
        photoUrl,
        familyId: session.user.familyId!,
        createdById: session.user.id,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ dish }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/api/dishes/dishes.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/dishes/route.ts src/__tests__/api/dishes/dishes.test.ts
git commit -m "feat(meals): add dishes API routes"
```

---

## Task 5: Create Meals API Routes

**Files:**
- Create: `src/app/api/meals/route.ts`
- Create: `src/__tests__/api/meals/meals.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/api/meals/meals.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockRequest, parseResponse } from '../../helpers/api-test-utils'
import { Role, MealType } from '@prisma/client'

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
      mealLog: {
        findMany: vi.fn(),
        create: vi.fn(),
      },
      dish: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    }
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET, POST } from '@/app/api/meals/route'

describe('Meals API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/meals', () => {
    it('should return 500 if not authenticated', async () => {
      const response = await GET(new Request('http://localhost/api/meals'))
      const { status, data } = await parseResponse(response)

      expect(status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should return meal logs for the family', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.mealLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          familyId: 'family-1',
          dishId: 'dish-1',
          mealType: MealType.DINNER,
          date: new Date(),
          loggedById: 'user-1',
          dish: {
            id: 'dish-1',
            name: 'Beef Stir Fry',
            photoUrl: 'https://example.com/beef.jpg',
          },
          loggedBy: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const response = await GET(new Request('http://localhost/api/meals'))
      const { status, data } = await parseResponse<{ meals: unknown[] }>(response)

      expect(status).toBe(200)
      expect(data.meals).toHaveLength(1)
    })
  })

  describe('POST /api/meals', () => {
    it('should return 400 if mealType is missing', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', { dishId: 'dish-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should create meal log for existing dish', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.dish.findFirst.mockResolvedValue({
        id: 'dish-1',
        name: 'Beef Stir Fry',
        photoUrl: 'https://example.com/beef.jpg',
        totalVotes: 0,
        familyId: 'family-1',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.mealLog.create.mockResolvedValue({
        id: 'log-1',
        familyId: 'family-1',
        dishId: 'dish-1',
        mealType: MealType.DINNER,
        date: new Date(),
        loggedById: 'user-1',
        dish: {
          id: 'dish-1',
          name: 'Beef Stir Fry',
          photoUrl: 'https://example.com/beef.jpg',
        },
        loggedBy: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', {
        dishId: 'dish-1',
        mealType: 'DINNER',
        date: '2026-01-28',
      })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ meal: { id: string } }>(response)

      expect(status).toBe(201)
      expect(data.meal).toBeDefined()
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/api/meals/meals.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/app/api/meals/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { MealType } from "@prisma/client";

// GET /api/meals - Get meal logs for the family
export async function GET(req: Request) {
  try {
    const session = await requireFamily();
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get("days") || "7", 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const meals = await prisma.mealLog.findMany({
      where: {
        familyId: session.user.familyId!,
        date: {
          gte: startDate,
        },
      },
      include: {
        dish: {
          select: { id: true, name: true, photoUrl: true },
        },
        loggedBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return NextResponse.json({ meals });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/meals - Log a meal
export async function POST(req: Request) {
  try {
    const session = await requireFamily();

    const { dishId, newDish, mealType, date } = await req.json();

    // Validate mealType
    if (!mealType || !Object.values(MealType).includes(mealType)) {
      return NextResponse.json(
        { error: "Valid meal type is required (BREAKFAST, LUNCH, or DINNER)" },
        { status: 400 }
      );
    }

    let finalDishId = dishId;

    // If new dish data provided, create the dish first
    if (newDish && !dishId) {
      if (!newDish.name || !newDish.photoUrl) {
        return NextResponse.json(
          { error: "New dish requires name and photoUrl" },
          { status: 400 }
        );
      }

      const createdDish = await prisma.dish.create({
        data: {
          name: newDish.name.trim(),
          photoUrl: newDish.photoUrl,
          familyId: session.user.familyId!,
          createdById: session.user.id,
        },
      });
      finalDishId = createdDish.id;
    }

    if (!finalDishId) {
      return NextResponse.json(
        { error: "Either dishId or newDish is required" },
        { status: 400 }
      );
    }

    // Verify dish belongs to family
    const dish = await prisma.dish.findFirst({
      where: {
        id: finalDishId,
        familyId: session.user.familyId!,
      },
    });

    if (!dish) {
      return NextResponse.json(
        { error: "Dish not found" },
        { status: 404 }
      );
    }

    const meal = await prisma.mealLog.create({
      data: {
        familyId: session.user.familyId!,
        dishId: finalDishId,
        mealType: mealType as MealType,
        date: date ? new Date(date) : new Date(),
        loggedById: session.user.id,
      },
      include: {
        dish: {
          select: { id: true, name: true, photoUrl: true },
        },
        loggedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ meal }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Step 4: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/api/meals/meals.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/app/api/meals/route.ts src/__tests__/api/meals/meals.test.ts
git commit -m "feat(meals): add meals API routes for logging"
```

---

## Task 6: Create Votes API Routes

**Files:**
- Create: `src/app/api/votes/route.ts`
- Create: `src/app/api/votes/[id]/route.ts`
- Create: `src/__tests__/api/votes/votes.test.ts`

**Step 1: Write the failing tests**

Create `src/__tests__/api/votes/votes.test.ts`:

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

vi.mock('@/lib/week-utils', () => ({
  getWeekStart: vi.fn(() => new Date('2026-01-26T00:00:00')),
}))

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      weeklyVote: {
        findMany: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
      },
      dish: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
    }
  }
})

import { prisma } from '@/lib/db'
const mockPrisma = vi.mocked(prisma)

import { GET, POST } from '@/app/api/votes/route'

describe('Votes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSession = null
  })

  describe('GET /api/votes', () => {
    it('should return 500 if not authenticated', async () => {
      const response = await GET()
      const { status, data } = await parseResponse(response)

      expect(status).toBe(500)
      expect(data).toHaveProperty('error')
    })

    it('should return current week votes', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.weeklyVote.findMany.mockResolvedValue([
        {
          id: 'vote-1',
          familyId: 'family-1',
          dishId: 'dish-1',
          suggestedDishName: null,
          voterId: 'user-1',
          weekStart: new Date('2026-01-26'),
          dish: { id: 'dish-1', name: 'Beef Stir Fry', photoUrl: 'https://example.com/beef.jpg', totalVotes: 3 },
          voter: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const response = await GET()
      const { status, data } = await parseResponse<{ votes: unknown[] }>(response)

      expect(status).toBe(200)
      expect(data.votes).toHaveLength(1)
    })
  })

  describe('POST /api/votes', () => {
    it('should return 400 if neither dishId nor suggestedDishName provided', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      const request = createMockRequest('POST', {})
      const response = await POST(request)
      const { status, data } = await parseResponse(response)

      expect(status).toBe(400)
      expect(data).toHaveProperty('error')
    })

    it('should create vote for existing dish', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.dish.findFirst.mockResolvedValue({
        id: 'dish-1',
        name: 'Beef Stir Fry',
        photoUrl: 'https://example.com/beef.jpg',
        totalVotes: 2,
        familyId: 'family-1',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.weeklyVote.findFirst.mockResolvedValue(null) // No existing vote

      mockPrisma.weeklyVote.create.mockResolvedValue({
        id: 'vote-1',
        familyId: 'family-1',
        dishId: 'dish-1',
        suggestedDishName: null,
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        dish: { id: 'dish-1', name: 'Beef Stir Fry', photoUrl: 'https://example.com/beef.jpg', totalVotes: 3 },
        voter: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      mockPrisma.dish.update.mockResolvedValue({
        id: 'dish-1',
        name: 'Beef Stir Fry',
        photoUrl: 'https://example.com/beef.jpg',
        totalVotes: 3,
        familyId: 'family-1',
        createdById: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', { dishId: 'dish-1' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ vote: { id: string } }>(response)

      expect(status).toBe(201)
      expect(data.vote).toBeDefined()
    })

    it('should create vote for suggested dish', async () => {
      mockSession = {
        user: {
          id: 'user-1',
          email: 'test@example.com',
          role: Role.PARENT,
          familyId: 'family-1',
        },
      }

      mockPrisma.weeklyVote.findFirst.mockResolvedValue(null)

      mockPrisma.weeklyVote.create.mockResolvedValue({
        id: 'vote-2',
        familyId: 'family-1',
        dishId: null,
        suggestedDishName: 'Sushi Night',
        voterId: 'user-1',
        weekStart: new Date('2026-01-26'),
        dish: null,
        voter: { id: 'user-1', name: 'Parent', email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const request = createMockRequest('POST', { suggestedDishName: 'Sushi Night' })
      const response = await POST(request)
      const { status, data } = await parseResponse<{ vote: { suggestedDishName: string } }>(response)

      expect(status).toBe(201)
      expect(data.vote.suggestedDishName).toBe('Sushi Night')
    })
  })
})
```

**Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/__tests__/api/votes/votes.test.ts
```

Expected: FAIL - module not found

**Step 3: Write the implementation for /api/votes**

Create `src/app/api/votes/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";
import { getWeekStart } from "@/lib/week-utils";

// GET /api/votes - Get current week's votes
export async function GET() {
  try {
    const session = await requireFamily();
    const weekStart = getWeekStart(new Date());

    const votes = await prisma.weeklyVote.findMany({
      where: {
        familyId: session.user.familyId!,
        weekStart,
      },
      include: {
        dish: {
          select: { id: true, name: true, photoUrl: true, totalVotes: true },
        },
        voter: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ votes, weekStart });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// POST /api/votes - Cast a vote
export async function POST(req: Request) {
  try {
    const session = await requireFamily();
    const { dishId, suggestedDishName } = await req.json();

    if (!dishId && !suggestedDishName) {
      return NextResponse.json(
        { error: "Either dishId or suggestedDishName is required" },
        { status: 400 }
      );
    }

    if (dishId && suggestedDishName) {
      return NextResponse.json(
        { error: "Provide either dishId or suggestedDishName, not both" },
        { status: 400 }
      );
    }

    const weekStart = getWeekStart(new Date());

    // Check for existing vote
    const existingVote = await prisma.weeklyVote.findFirst({
      where: {
        familyId: session.user.familyId!,
        voterId: session.user.id,
        weekStart,
        ...(dishId ? { dishId } : { suggestedDishName }),
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted for this dish this week" },
        { status: 400 }
      );
    }

    // If voting for existing dish, verify it exists
    if (dishId) {
      const dish = await prisma.dish.findFirst({
        where: {
          id: dishId,
          familyId: session.user.familyId!,
        },
      });

      if (!dish) {
        return NextResponse.json(
          { error: "Dish not found" },
          { status: 404 }
        );
      }

      // Increment totalVotes on dish
      await prisma.dish.update({
        where: { id: dishId },
        data: { totalVotes: { increment: 1 } },
      });
    }

    const vote = await prisma.weeklyVote.create({
      data: {
        familyId: session.user.familyId!,
        voterId: session.user.id,
        weekStart,
        ...(dishId ? { dishId } : { suggestedDishName: suggestedDishName.trim() }),
      },
      include: {
        dish: {
          select: { id: true, name: true, photoUrl: true, totalVotes: true },
        },
        voter: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ vote }, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Step 4: Write the implementation for /api/votes/[id]**

Create `src/app/api/votes/[id]/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFamily } from "@/lib/permissions";

// DELETE /api/votes/[id] - Remove a vote
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireFamily();
    const { id } = await params;

    const vote = await prisma.weeklyVote.findFirst({
      where: {
        id,
        familyId: session.user.familyId!,
        voterId: session.user.id,
      },
    });

    if (!vote) {
      return NextResponse.json(
        { error: "Vote not found or not yours to delete" },
        { status: 404 }
      );
    }

    // If vote was for an existing dish, decrement totalVotes
    if (vote.dishId) {
      await prisma.dish.update({
        where: { id: vote.dishId },
        data: { totalVotes: { decrement: 1 } },
      });
    }

    await prisma.weeklyVote.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
```

**Step 5: Run test to verify it passes**

```bash
npm run test:run -- src/__tests__/api/votes/votes.test.ts
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/app/api/votes src/__tests__/api/votes/votes.test.ts
git commit -m "feat(meals): add votes API routes"
```

---

## Task 7: Create DishCard Component

**Files:**
- Create: `src/components/meals/DishCard.tsx`

**Step 1: Create the component**

Create `src/components/meals/DishCard.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";

type DishCardProps = {
  dish: {
    id: string;
    name: string;
    photoUrl: string;
    totalVotes: number;
  };
  voteCount?: number;
  isVoted?: boolean;
  onVote?: () => void;
  onUnvote?: () => void;
  showVoteButton?: boolean;
};

export default function DishCard({
  dish,
  voteCount = 0,
  isVoted = false,
  onVote,
  onUnvote,
  showVoteButton = false,
}: DishCardProps) {
  const t = useTranslations("meals");
  const isFavorite = dish.totalVotes >= 5;

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow">
      <div className="h-32 sm:h-40 overflow-hidden bg-gray-200 relative">
        <img
          src={dish.photoUrl}
          alt={dish.name}
          className="w-full h-full object-cover"
        />
        {isFavorite && (
          <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full">
            ⭐
          </span>
        )}
        {isVoted && (
          <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center">
            <span className="bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              ✓ {t("voted")}
            </span>
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-medium text-gray-900 truncate">{dish.name}</h3>
        <div className="flex items-center justify-between mt-2">
          <span className="text-sm text-gray-500">
            {voteCount} {t("votes")}
          </span>
          {showVoteButton && (
            <button
              onClick={isVoted ? onUnvote : onVote}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                isVoted
                  ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {isVoted ? "−" : "+"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/meals/DishCard.tsx
git commit -m "feat(meals): add DishCard component"
```

---

## Task 8: Create LogDishForm Component

**Files:**
- Create: `src/components/meals/LogDishForm.tsx`

**Step 1: Create the component**

Create `src/components/meals/LogDishForm.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";

type Dish = {
  id: string;
  name: string;
  photoUrl: string;
};

type LogDishFormProps = {
  onClose: () => void;
  onSuccess: () => void;
};

export default function LogDishForm({ onClose, onSuccess }: LogDishFormProps) {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isNewDish, setIsNewDish] = useState(false);
  const [newDishName, setNewDishName] = useState("");
  const [mealType, setMealType] = useState<"BREAKFAST" | "LUNCH" | "DINNER">("DINNER");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDishes();
  }, []);

  const fetchDishes = async () => {
    try {
      const response = await fetch("/api/dishes");
      const data = await response.json();
      if (response.ok) {
        setDishes(data.dishes);
      }
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
    }
  };

  const filteredDishes = dishes.filter((dish) =>
    dish.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File too large (max 5MB)");
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;

    const formData = new FormData();
    formData.append("file", photoFile);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to upload photo");
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    try {
      let photoUrl: string | null = null;

      // Upload photo if provided
      if (photoFile) {
        photoUrl = await uploadPhoto();
      }

      // For new dish, photo is required
      if (isNewDish && !photoUrl) {
        setError(t("photoRequired"));
        setSaving(false);
        return;
      }

      const body: Record<string, unknown> = {
        mealType,
        date,
      };

      if (isNewDish) {
        body.newDish = {
          name: newDishName,
          photoUrl,
        };
      } else if (selectedDish) {
        body.dishId = selectedDish.id;
      } else {
        setError("Please select a dish or add a new one");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to log meal");
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">{t("logDish")}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Dish Selection */}
            {!isNewDish ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("selectExisting")}
                </label>
                <input
                  type="text"
                  placeholder={t("searchDishes")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md mb-2"
                />
                <div className="max-h-40 overflow-y-auto border rounded-md">
                  {filteredDishes.length === 0 ? (
                    <div className="p-3 text-gray-500 text-sm">
                      {t("noMatchingDishes")}
                    </div>
                  ) : (
                    filteredDishes.map((dish) => (
                      <button
                        key={dish.id}
                        type="button"
                        onClick={() => setSelectedDish(dish)}
                        className={`w-full p-2 text-left flex items-center gap-2 hover:bg-gray-50 ${
                          selectedDish?.id === dish.id ? "bg-orange-50 border-l-2 border-orange-500" : ""
                        }`}
                      >
                        <img
                          src={dish.photoUrl}
                          alt={dish.name}
                          className="w-10 h-10 rounded object-cover"
                        />
                        <span className="text-sm">{dish.name}</span>
                      </button>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewDish(true)}
                  className="mt-2 text-sm text-orange-600 hover:text-orange-700"
                >
                  + {t("orAddNew")}
                </button>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {t("dishName")}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsNewDish(false);
                      setNewDishName("");
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    {t("selectExisting")}
                  </button>
                </div>
                <input
                  type="text"
                  value={newDishName}
                  onChange={(e) => setNewDishName(e.target.value)}
                  placeholder={t("dishNamePlaceholder")}
                  className="w-full px-3 py-2 border rounded-md"
                  required={isNewDish}
                />
              </div>
            )}

            {/* Photo Upload (required for new, optional for existing) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("photo")} {isNewDish ? `(${t("photoRequired")})` : `(${t("photoOptional")})`}
              </label>
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-40 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="block w-full p-4 border-2 border-dashed rounded-md text-center cursor-pointer hover:border-orange-500">
                  <span className="text-gray-500">Click to upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Meal Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("mealType")}
              </label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as "BREAKFAST" | "LUNCH" | "DINNER")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="BREAKFAST">{t("breakfast")}</option>
                <option value="LUNCH">{t("lunch")}</option>
                <option value="DINNER">{t("dinner")}</option>
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t("date")}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                {tCommon("cancel")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
              >
                {saving ? t("logging") : t("logMeal")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add src/components/meals/LogDishForm.tsx
git commit -m "feat(meals): add LogDishForm component"
```

---

## Task 9: Create Meals Hub Page

**Files:**
- Create: `src/app/(parent)/meals/page.tsx`
- Create: `src/components/meals/MealsPageHeader.tsx`
- Create: `src/components/meals/RecentMeals.tsx`

**Step 1: Create the page header**

Create `src/components/meals/MealsPageHeader.tsx`:

```tsx
"use client";

import { useTranslations } from "next-intl";

export default function MealsPageHeader() {
  const t = useTranslations("meals");

  return (
    <>
      <h1 className="text-3xl font-bold text-gray-900">{t("pageTitle")}</h1>
      <p className="mt-2 text-gray-600">{t("pageDesc")}</p>
    </>
  );
}
```

**Step 2: Create the RecentMeals component**

Create `src/components/meals/RecentMeals.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import LogDishForm from "./LogDishForm";

type Meal = {
  id: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER";
  date: string;
  dish: {
    id: string;
    name: string;
    photoUrl: string;
  };
  loggedBy: {
    name: string | null;
    email: string;
  };
};

export default function RecentMeals() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [meals, setMeals] = useState<Meal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    fetchMeals();
  }, []);

  const fetchMeals = async () => {
    try {
      const response = await fetch("/api/meals?days=7");
      const data = await response.json();
      if (response.ok) {
        setMeals(data.meals);
      }
    } catch (err) {
      console.error("Failed to fetch meals:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setShowForm(false);
    fetchMeals();
  };

  const mealTypeLabel = (type: string) => {
    switch (type) {
      case "BREAKFAST":
        return t("breakfast");
      case "LUNCH":
        return t("lunch");
      case "DINNER":
        return t("dinner");
      default:
        return type;
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  return (
    <div>
      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium"
        >
          + {t("logDish")}
        </button>
        <Link
          href="/meals/vote"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("vote")}
        </Link>
        <Link
          href="/meals/results"
          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          {t("results")}
        </Link>
      </div>

      {/* Recent Dishes */}
      <h2 className="text-xl font-bold text-gray-900 mb-4">{t("recentDishes")}</h2>

      {meals.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500 mb-4">{t("noDishesYet")}</p>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
          >
            {t("logFirstDish")}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {meals.map((meal) => (
            <div
              key={meal.id}
              className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
            >
              <img
                src={meal.dish.photoUrl}
                alt={meal.dish.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{meal.dish.name}</h3>
                <p className="text-sm text-gray-500">
                  {mealTypeLabel(meal.mealType)} •{" "}
                  {new Date(meal.date).toLocaleDateString()}
                </p>
                <p className="text-xs text-gray-400">
                  {meal.loggedBy.name || meal.loggedBy.email}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <LogDishForm onClose={() => setShowForm(false)} onSuccess={handleSuccess} />
      )}
    </div>
  );
}
```

**Step 3: Create the page**

Create `src/app/(parent)/meals/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import MealsPageHeader from "@/components/meals/MealsPageHeader";
import RecentMeals from "@/components/meals/RecentMeals";

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
          <RecentMeals />
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Commit**

```bash
git add src/app/\(parent\)/meals/page.tsx src/components/meals/MealsPageHeader.tsx src/components/meals/RecentMeals.tsx
git commit -m "feat(meals): add meals hub page"
```

---

## Task 10: Create Voting Page

**Files:**
- Create: `src/app/(parent)/meals/vote/page.tsx`
- Create: `src/components/meals/VotingGrid.tsx`

**Step 1: Create the VotingGrid component**

Create `src/components/meals/VotingGrid.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import DishCard from "./DishCard";

type Dish = {
  id: string;
  name: string;
  photoUrl: string;
  totalVotes: number;
};

type Vote = {
  id: string;
  dishId: string | null;
  suggestedDishName: string | null;
  voter: { id: string; name: string | null; email: string };
};

export default function VotingGrid() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [myVotes, setMyVotes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [suggestName, setSuggestName] = useState("");
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    Promise.all([fetchDishes(), fetchVotes()]).then(() => setLoading(false));
  }, []);

  const fetchDishes = async () => {
    try {
      const response = await fetch("/api/dishes");
      const data = await response.json();
      if (response.ok) {
        setDishes(data.dishes);
      }
    } catch (err) {
      console.error("Failed to fetch dishes:", err);
    }
  };

  const fetchVotes = async () => {
    try {
      const response = await fetch("/api/votes");
      const data = await response.json();
      if (response.ok) {
        setVotes(data.votes);
        // Extract my votes (assumes current user is in the response)
        const myDishVotes = new Set(
          data.votes
            .filter((v: Vote) => v.dishId)
            .map((v: Vote) => v.dishId as string)
        );
        setMyVotes(myDishVotes);
      }
    } catch (err) {
      console.error("Failed to fetch votes:", err);
    }
  };

  const getVoteCount = (dishId: string) => {
    return votes.filter((v) => v.dishId === dishId).length;
  };

  const handleVote = async (dishId: string) => {
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dishId }),
      });

      if (response.ok) {
        setMyVotes(new Set([...myVotes, dishId]));
        fetchVotes();
      }
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  const handleUnvote = async (dishId: string) => {
    const vote = votes.find((v) => v.dishId === dishId);
    if (!vote) return;

    try {
      const response = await fetch(`/api/votes/${vote.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        const newVotes = new Set(myVotes);
        newVotes.delete(dishId);
        setMyVotes(newVotes);
        fetchVotes();
      }
    } catch (err) {
      console.error("Failed to remove vote:", err);
    }
  };

  const handleSuggest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestName.trim()) return;

    setSuggesting(true);
    try {
      const response = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suggestedDishName: suggestName }),
      });

      if (response.ok) {
        setSuggestName("");
        fetchVotes();
      }
    } catch (err) {
      console.error("Failed to suggest:", err);
    } finally {
      setSuggesting(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  const favorites = dishes.filter((d) => d.totalVotes >= 5);
  const regularDishes = dishes.filter((d) => d.totalVotes < 5);

  return (
    <div>
      {/* Suggest New Dish */}
      <form onSubmit={handleSuggest} className="mb-6 flex gap-2">
        <input
          type="text"
          value={suggestName}
          onChange={(e) => setSuggestName(e.target.value)}
          placeholder={t("suggestPlaceholder")}
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button
          type="submit"
          disabled={suggesting || !suggestName.trim()}
          className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:opacity-50"
        >
          {t("suggest")}
        </button>
      </form>

      {/* Family Favorites */}
      {favorites.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            ⭐ {t("familyFavorites")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {favorites.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                voteCount={getVoteCount(dish.id)}
                isVoted={myVotes.has(dish.id)}
                onVote={() => handleVote(dish.id)}
                onUnvote={() => handleUnvote(dish.id)}
                showVoteButton
              />
            ))}
          </div>
        </div>
      )}

      {/* All Dishes */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">{t("allDishes")}</h2>
        {regularDishes.length === 0 && favorites.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-500">{t("noDishesYet")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {regularDishes.map((dish) => (
              <DishCard
                key={dish.id}
                dish={dish}
                voteCount={getVoteCount(dish.id)}
                isVoted={myVotes.has(dish.id)}
                onVote={() => handleVote(dish.id)}
                onUnvote={() => handleUnvote(dish.id)}
                showVoteButton
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create the voting page**

Create `src/app/(parent)/meals/vote/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import Link from "next/link";
import VotingGrid from "@/components/meals/VotingGrid";
import { getTranslations } from "next-intl/server";

export default async function MealsVotePage() {
  const session = await getSession();
  const t = await getTranslations("meals");

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/meals"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t("votingTitle")}</h1>
        <p className="mt-2 text-gray-600">{t("votingDesc")}</p>
        <div className="mt-8">
          <VotingGrid />
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/\(parent\)/meals/vote/page.tsx src/components/meals/VotingGrid.tsx
git commit -m "feat(meals): add voting page"
```

---

## Task 11: Create Results Page

**Files:**
- Create: `src/app/(parent)/meals/results/page.tsx`
- Create: `src/components/meals/VoteResults.tsx`

**Step 1: Create VoteResults component**

Create `src/components/meals/VoteResults.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type Vote = {
  id: string;
  dishId: string | null;
  suggestedDishName: string | null;
  dish: {
    id: string;
    name: string;
    photoUrl: string;
    totalVotes: number;
  } | null;
  voter: {
    id: string;
    name: string | null;
    email: string;
  };
};

type DishVotes = {
  dish: {
    id: string;
    name: string;
    photoUrl: string;
    totalVotes: number;
  };
  votes: Vote[];
};

type SuggestionVotes = {
  name: string;
  votes: Vote[];
};

export default function VoteResults() {
  const t = useTranslations("meals");
  const tCommon = useTranslations("common");

  const [votes, setVotes] = useState<Vote[]>([]);
  const [weekStart, setWeekStart] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVotes();
  }, []);

  const fetchVotes = async () => {
    try {
      const response = await fetch("/api/votes");
      const data = await response.json();
      if (response.ok) {
        setVotes(data.votes);
        setWeekStart(data.weekStart);
      }
    } catch (err) {
      console.error("Failed to fetch votes:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">{tCommon("loading")}</div>;
  }

  // Group votes by dish
  const dishVotesMap = new Map<string, DishVotes>();
  const suggestionVotesMap = new Map<string, SuggestionVotes>();

  votes.forEach((vote) => {
    if (vote.dishId && vote.dish) {
      const existing = dishVotesMap.get(vote.dishId);
      if (existing) {
        existing.votes.push(vote);
      } else {
        dishVotesMap.set(vote.dishId, {
          dish: vote.dish,
          votes: [vote],
        });
      }
    } else if (vote.suggestedDishName) {
      const existing = suggestionVotesMap.get(vote.suggestedDishName);
      if (existing) {
        existing.votes.push(vote);
      } else {
        suggestionVotesMap.set(vote.suggestedDishName, {
          name: vote.suggestedDishName,
          votes: [vote],
        });
      }
    }
  });

  // Sort by vote count
  const sortedDishes = Array.from(dishVotesMap.values()).sort(
    (a, b) => b.votes.length - a.votes.length
  );

  const sortedSuggestions = Array.from(suggestionVotesMap.values()).sort(
    (a, b) => b.votes.length - a.votes.length
  );

  const hasAnyVotes = sortedDishes.length > 0 || sortedSuggestions.length > 0;

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6">
        {t("weekResets")} •{" "}
        {weekStart && new Date(weekStart).toLocaleDateString()}
      </p>

      {!hasAnyVotes ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">{t("noVotesYet")}</p>
        </div>
      ) : (
        <>
          {/* Dish Votes */}
          {sortedDishes.length > 0 && (
            <div className="space-y-4 mb-8">
              {sortedDishes.map(({ dish, votes: dishVotes }, index) => (
                <div
                  key={dish.id}
                  className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
                >
                  <span className="text-2xl font-bold text-gray-300 w-8">
                    #{index + 1}
                  </span>
                  <img
                    src={dish.photoUrl}
                    alt={dish.name}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{dish.name}</h3>
                      {dish.totalVotes >= 5 && (
                        <span className="text-yellow-500">⭐</span>
                      )}
                    </div>
                    <p className="text-lg font-bold text-orange-500">
                      {dishVotes.length} {t("votes")}
                    </p>
                    <p className="text-sm text-gray-500">
                      {t("votedBy")}:{" "}
                      {dishVotes
                        .map((v) => v.voter.name || v.voter.email)
                        .join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Suggestions */}
          {sortedSuggestions.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                {t("suggestedDishes")}
              </h2>
              <div className="space-y-3">
                {sortedSuggestions.map(({ name, votes: suggestionVotes }) => (
                  <div
                    key={name}
                    className="bg-white rounded-lg shadow p-4 flex items-center gap-4"
                  >
                    <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center text-2xl">
                      🍽️
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{name}</h3>
                      <p className="text-lg font-bold text-orange-500">
                        {suggestionVotes.length} {t("votes")}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t("votedBy")}:{" "}
                        {suggestionVotes
                          .map((v) => v.voter.name || v.voter.email)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

**Step 2: Create the results page**

Create `src/app/(parent)/meals/results/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/permissions";
import Link from "next/link";
import VoteResults from "@/components/meals/VoteResults";
import { getTranslations } from "next-intl/server";

export default async function MealsResultsPage() {
  const session = await getSession();
  const t = await getTranslations("meals");

  if (!session?.user) {
    redirect("/login");
  }

  if (!session.user.familyId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-2">
          <Link
            href="/meals"
            className="text-gray-500 hover:text-gray-700"
          >
            ← Back
          </Link>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">{t("resultsTitle")}</h1>
        <p className="mt-2 text-gray-600">{t("resultsDesc")}</p>
        <div className="mt-8">
          <VoteResults />
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add src/app/\(parent\)/meals/results/page.tsx src/components/meals/VoteResults.tsx
git commit -m "feat(meals): add results page"
```

---

## Task 12: Add Meals to Dashboard Navigation

**Files:**
- Modify: `src/components/parent/ParentDashboardCards.tsx`

**Step 1: Add meals card to dashboard**

In `src/components/parent/ParentDashboardCards.tsx`, add a new Link card after the existing cards (before the closing `</div>`):

```tsx
      <Link
        href="/meals"
        className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
      >
        <div className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-medium text-gray-900">
                {tNav("meals")}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {t("manageMeals")}
              </p>
            </div>
          </div>
        </div>
      </Link>
```

Also add the translation key to the parent section of locales files:

In `src/locales/en.json`, add to "parent" section:
```json
"manageMeals": "Plan family meals together"
```

In `src/locales/zh.json`, add to "parent" section:
```json
"manageMeals": "一起计划家庭餐食"
```

**Step 2: Commit**

```bash
git add src/components/parent/ParentDashboardCards.tsx src/locales/en.json src/locales/zh.json
git commit -m "feat(meals): add meals to parent dashboard"
```

---

## Task 13: Run All Tests and Verify

**Step 1: Run all tests**

```bash
npm run test:run
```

Expected: All new tests pass. Pre-existing failures (6) remain.

**Step 2: Build the app**

```bash
npm run build
```

Expected: Build succeeds without errors.

**Step 3: Commit if any fixes needed**

If build or tests reveal issues, fix and commit.

---

## Task 14: Final Review and Summary Commit

**Step 1: Review all changes**

```bash
git log --oneline feature/meal-voting ^main
```

**Step 2: Verify feature is complete**

Checklist:
- [ ] Prisma models: Dish, MealLog, WeeklyVote
- [ ] API routes: /api/dishes, /api/meals, /api/votes
- [ ] Week utilities: getWeekStart, isSameWeek
- [ ] Components: DishCard, LogDishForm, VotingGrid, VoteResults
- [ ] Pages: /meals, /meals/vote, /meals/results
- [ ] Dashboard navigation updated
- [ ] i18n translations (en + zh)
- [ ] Tests passing

**Step 3: Ready for PR**

The feature branch is ready for review. Use `superpowers:finishing-a-development-branch` to create a PR or merge.
