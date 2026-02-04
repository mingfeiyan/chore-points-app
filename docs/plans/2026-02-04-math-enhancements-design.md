# Math Learning Enhancements

## Overview

Enhance the math learning feature with mistake tracking, AI-powered insights, configurable question generation, and custom question support. Also update the Learning Center flow to let kids choose between Sight Words and Math independently.

## Requirements

| Aspect | Decision |
|--------|----------|
| **Mistake Tracking** | Log every attempt (right and wrong) with full details |
| **AI Insights** | On-demand pattern analysis via "Analyze" button |
| **Question Rules** | Parent-configurable difficulty, number ranges, focus areas |
| **Custom Questions** | Parent can add homework problems, drills, special formats |
| **Practice Modes** | Separate Daily Practice and Custom Practice modes |
| **Question Count** | Configurable per-session (1-20 questions) |
| **Adaptive Difficulty** | Optional AI auto-adjustment based on performance |
| **Kid Flow** | Tab-based selection, Sight Words no longer blocks Math |

## Data Model

### New Tables

**MathAttempt** - Records every answer attempt

```prisma
model MathAttempt {
  id            String   @id @default(cuid())
  kidId         String
  kid           User     @relation("KidMathAttempts", fields: [kidId], references: [id], onDelete: Cascade)
  questionType  String   // "addition", "subtraction", "multiplication", "division"
  question      String   // e.g., "12 + 7"
  correctAnswer Int
  givenAnswer   Int
  isCorrect     Boolean
  responseTimeMs Int?    // optional, helps spot guessing vs thinking
  source        String   // "daily" or "custom"
  createdAt     DateTime @default(now())

  @@index([kidId])
  @@index([kidId, createdAt])
  @@index([kidId, questionType])
}
```

**MathSettings** - Per-family configuration

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

  // Addition ranges
  additionMinA          Int     @default(1)
  additionMaxA          Int     @default(9)
  additionMinB          Int     @default(10)
  additionMaxB          Int     @default(99)
  allowCarrying         Boolean @default(true)

  // Subtraction ranges
  subtractionMinA       Int     @default(10)
  subtractionMaxA       Int     @default(99)
  subtractionMinB       Int     @default(1)
  subtractionMaxB       Int     @default(9)
  allowBorrowing        Boolean @default(true)

  // Multiplication ranges
  multiplicationMinA    Int     @default(1)
  multiplicationMaxA    Int     @default(10)
  multiplicationMinB    Int     @default(1)
  multiplicationMaxB    Int     @default(10)

  // Division ranges
  divisionMinDividend   Int     @default(1)
  divisionMaxDividend   Int     @default(100)
  divisionMinDivisor    Int     @default(1)
  divisionMaxDivisor    Int     @default(10)

  adaptiveDifficulty    Boolean @default(false)
  focusAreas            Json    @default("[]") // e.g., ["times-7", "subtraction-borrowing"]

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

**CustomMathQuestion** - Parent-created questions

```prisma
model CustomMathQuestion {
  id            String   @id @default(cuid())
  familyId      String
  family        Family   @relation(fields: [familyId], references: [id], onDelete: Cascade)
  createdById   String
  createdBy     User     @relation("CustomMathQuestionCreatedBy", fields: [createdById], references: [id])

  question      String   // e.g., "12 + 7" or "What is 3 times 4?"
  answer        Int
  questionType  String   // "addition", "subtraction", "multiplication", "division", "word-problem"
  tags          Json     @default("[]") // e.g., ["homework", "week-of-jan-20"]

  isActive      Boolean  @default(true)
  sortOrder     Int      @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([familyId])
  @@index([familyId, isActive])
}
```

The existing `MathProgress` table remains unchanged for tracking daily completion status.

## API Routes

### Settings & Configuration

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/math/settings` | GET | Fetch current family math settings |
| `/api/math/settings` | PUT | Update settings (difficulty, question count, focus areas) |

### Custom Questions

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/math/questions` | GET | List custom questions (with optional tag filter) |
| `/api/math/questions` | POST | Add custom question(s) - supports bulk import |
| `/api/math/questions/[id]` | PUT | Edit a question |
| `/api/math/questions/[id]` | DELETE | Remove a question |

### Practice Sessions

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/math/today` | GET | (existing, enhanced) Returns daily practice questions based on settings |
| `/api/math/custom` | GET | Get custom practice questions (all active, or filtered by tags) |
| `/api/math/submit` | POST | (existing, enhanced) Submit answer - now logs to MathAttempt table |

### Analytics

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/math/attempts` | GET | Fetch attempt history with filters (kidId, date range, type) |
| `/api/math/stats` | GET | Aggregate stats (accuracy by type, common mistakes) |
| `/api/math/analyze` | POST | Send recent attempts to AI, get pattern insights |

### Permissions

- Parent-only: `/api/math/settings`, `/api/math/questions/*`, `/api/math/attempts`, `/api/math/stats`, `/api/math/analyze`
- Kid-accessible: `/api/math/today`, `/api/math/custom`, `/api/math/submit`

## UI Components

### Parent Side

#### Math Settings Page (`/learn/settings`)

**Daily Practice Config:**
- Number of questions per day (input: 1-20)
- Enable/disable question types (checkboxes: addition, subtraction, multiplication, division)
- Number ranges per type (e.g., "Addition: A is 1-9, B is 10-99")
- Toggle: allow carrying, allow borrowing
- Toggle: adaptive difficulty on/off

**Focus Areas Selector:**
- Preset options: "Times tables (pick which)", "Subtraction with borrowing", "Addition with carrying"
- AI suggestion based on recent mistakes

#### Custom Questions Manager (`/learn/questions`)

- List view of all custom questions with search/filter by tags
- Add single question form: type the problem and answer
- Bulk import: paste multiple lines like "12 + 7 = 19" and auto-parse
- Tag management for organization
- Active/inactive toggle per question
- Edit and delete actions

#### Analytics Page (`/learn/progress`)

**Header:**
- Kid selector dropdown (if multiple kids)
- Date range filter (last 7 days, 30 days, all time)

**Summary Cards:**
- Total questions attempted
- Overall accuracy percentage
- Current streak (consecutive correct answers or days practiced)
- Breakdown by type (e.g., "Addition: 87%, Subtraction: 62%")

**Mistake Log:**
- Scrollable table showing wrong answers
- Columns: Date, Question, Given Answer, Correct Answer, Type
- Filter by question type
- Most recent first

**AI Insights Panel:**
- "Analyze Mistakes" button
- Loading state while AI processes
- Returns 3-5 actionable insights, e.g.:
  - "Often subtracts smaller digit from larger regardless of position (e.g., 32-7=35 instead of 25)"
  - "Strong with addition under 20, struggles when sum exceeds 20 (carrying)"
  - "Suggestion: Focus on borrowing concepts with numbers 20-50"
- Option to auto-apply suggested focus areas to settings

### Kid Side

#### Learning Center Tabs

Top of page shows two tabs: **"Sight Words"** | **"Math"**
- Each tab shows a badge/dot if there's activity due
- Kid can do either in any order, or skip one entirely
- Points awarded independently (1 for sight word, 1 for math completion)

#### Math Tab

If custom questions exist, shows sub-selection: **"Daily Practice"** | **"Custom Practice"**

Otherwise goes straight into daily practice.

#### Session Flow

1. Kid opens Learning Center, sees tabs
2. Taps "Math" tab
3. Chooses Daily or Custom (if applicable)
4. Questions appear one at a time with number pad
5. Wrong answer: shake animation, "Try again" (attempt logged)
6. Correct answer: celebration, next question
7. Session complete: confetti, points awarded, summary ("You got 4/5 on the first try!")

#### Sight Words Tab

- Works as it does today
- No longer blocks math access
- Independent completion and points

### Adaptive Difficulty Logic

When enabled, AI adjusts question generation:
- After 3+ consecutive correct: nudge difficulty up (larger numbers, introduce carrying)
- After 2+ consecutive wrong: nudge difficulty down (smaller numbers, simpler problems)
- Stays within parent-configured bounds (won't exceed max ranges)
- Focus areas get higher probability of appearing

## Files to Create/Modify

### New Files

**API Routes:**
- `src/app/api/math/settings/route.ts` - GET/PUT for math settings
- `src/app/api/math/questions/route.ts` - GET/POST for custom questions
- `src/app/api/math/questions/[id]/route.ts` - PUT/DELETE for single question
- `src/app/api/math/custom/route.ts` - GET custom practice questions
- `src/app/api/math/attempts/route.ts` - GET attempt history
- `src/app/api/math/stats/route.ts` - GET aggregate stats
- `src/app/api/math/analyze/route.ts` - POST for AI insights

**Pages:**
- `src/app/(parent)/learn/progress/page.tsx` - Analytics page
- `src/app/(parent)/learn/settings/page.tsx` - Math settings page
- `src/app/(parent)/learn/questions/page.tsx` - Custom questions manager

**Components:**
- `src/components/learn/MathAnalytics.tsx` - Analytics display (stats cards, charts)
- `src/components/learn/MistakeLog.tsx` - Scrollable mistake history table
- `src/components/learn/AIInsightsPanel.tsx` - AI analysis display
- `src/components/learn/MathSettingsForm.tsx` - Settings form
- `src/components/learn/CustomQuestionForm.tsx` - Add/edit question form
- `src/components/learn/CustomQuestionsList.tsx` - Questions list with management
- `src/components/learn/BulkImportForm.tsx` - Bulk question import

**Utilities:**
- `src/lib/math-generator.ts` - AI-aware question generation with adaptive logic

### Modified Files

- `prisma/schema.prisma` - Add MathAttempt, MathSettings, CustomMathQuestion models
- `src/components/learn/LearningCenter.tsx` - Add tab navigation, remove sequential lock
- `src/components/learn/MathModule.tsx` - Support configurable questions, log attempts, show mode selection
- `src/app/api/math/submit/route.ts` - Log attempts to MathAttempt table
- `src/app/api/math/today/route.ts` - Use MathSettings for question generation
- `src/lib/math-utils.ts` - Enhance for configurable difficulty ranges
- `src/messages/en.json` - English translations for new UI
- `src/messages/zh.json` - Chinese translations for new UI

## Future Considerations (Out of Scope)

- Printable worksheets from custom questions
- Timed challenges / speed drills
- Multiplayer math races between siblings
- Integration with school curriculum standards
- Voice input for answers
