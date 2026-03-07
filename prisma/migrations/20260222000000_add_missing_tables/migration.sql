-- AlterTable
ALTER TABLE "Dish" ADD COLUMN     "ingredients" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "MathProgress" ADD COLUMN     "questionsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "questionsTarget" INTEGER NOT NULL DEFAULT 2;

-- AlterTable
ALTER TABLE "MealLog" ADD COLUMN     "cookedById" TEXT;

-- CreateTable
CREATE TABLE "Badge" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "choreId" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "firstEarnedAt" TIMESTAMP(3),
    "lastLevelUpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementBadge" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AchievementBadge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SightWord" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SightWord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SightWordProgress" (
    "id" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "sightWordId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3),
    "quizPassedAt" TIMESTAMP(3),
    "pointAwarded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SightWordProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MathAttempt" (
    "id" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "questionType" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "correctAnswer" INTEGER NOT NULL,
    "givenAnswer" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER,
    "source" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MathAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MathSettings" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "dailyQuestionCount" INTEGER NOT NULL DEFAULT 2,
    "additionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "subtractionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "multiplicationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "divisionEnabled" BOOLEAN NOT NULL DEFAULT false,
    "additionMinA" INTEGER NOT NULL DEFAULT 1,
    "additionMaxA" INTEGER NOT NULL DEFAULT 9,
    "additionMinB" INTEGER NOT NULL DEFAULT 10,
    "additionMaxB" INTEGER NOT NULL DEFAULT 99,
    "allowCarrying" BOOLEAN NOT NULL DEFAULT true,
    "subtractionMinA" INTEGER NOT NULL DEFAULT 10,
    "subtractionMaxA" INTEGER NOT NULL DEFAULT 99,
    "subtractionMinB" INTEGER NOT NULL DEFAULT 1,
    "subtractionMaxB" INTEGER NOT NULL DEFAULT 9,
    "allowBorrowing" BOOLEAN NOT NULL DEFAULT true,
    "multiplicationMinA" INTEGER NOT NULL DEFAULT 1,
    "multiplicationMaxA" INTEGER NOT NULL DEFAULT 10,
    "multiplicationMinB" INTEGER NOT NULL DEFAULT 1,
    "multiplicationMaxB" INTEGER NOT NULL DEFAULT 10,
    "divisionMinDividend" INTEGER NOT NULL DEFAULT 1,
    "divisionMaxDividend" INTEGER NOT NULL DEFAULT 100,
    "divisionMinDivisor" INTEGER NOT NULL DEFAULT 1,
    "divisionMaxDivisor" INTEGER NOT NULL DEFAULT 10,
    "adaptiveDifficulty" BOOLEAN NOT NULL DEFAULT false,
    "focusAreas" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MathSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeTemplate" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "builtInBadgeId" TEXT,
    "choreId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "name" TEXT,
    "nameZh" TEXT,
    "description" TEXT,
    "descriptionZh" TEXT,
    "imageUrl" TEXT,
    "icon" TEXT,
    "ruleConfig" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyPlan" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedMeal" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dishId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedMeal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Badge_familyId_idx" ON "Badge"("familyId");

-- CreateIndex
CREATE INDEX "Badge_kidId_idx" ON "Badge"("kidId");

-- CreateIndex
CREATE INDEX "Badge_familyId_kidId_idx" ON "Badge"("familyId", "kidId");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_kidId_choreId_key" ON "Badge"("kidId", "choreId");

-- CreateIndex
CREATE INDEX "AchievementBadge_familyId_idx" ON "AchievementBadge"("familyId");

-- CreateIndex
CREATE INDEX "AchievementBadge_kidId_idx" ON "AchievementBadge"("kidId");

-- CreateIndex
CREATE INDEX "AchievementBadge_familyId_kidId_idx" ON "AchievementBadge"("familyId", "kidId");

-- CreateIndex
CREATE UNIQUE INDEX "AchievementBadge_kidId_badgeId_key" ON "AchievementBadge"("kidId", "badgeId");

-- CreateIndex
CREATE INDEX "SightWord_familyId_idx" ON "SightWord"("familyId");

-- CreateIndex
CREATE INDEX "SightWord_familyId_sortOrder_idx" ON "SightWord"("familyId", "sortOrder");

-- CreateIndex
CREATE INDEX "SightWordProgress_kidId_idx" ON "SightWordProgress"("kidId");

-- CreateIndex
CREATE INDEX "SightWordProgress_sightWordId_idx" ON "SightWordProgress"("sightWordId");

-- CreateIndex
CREATE UNIQUE INDEX "SightWordProgress_kidId_sightWordId_key" ON "SightWordProgress"("kidId", "sightWordId");

-- CreateIndex
CREATE INDEX "MathAttempt_kidId_idx" ON "MathAttempt"("kidId");

-- CreateIndex
CREATE INDEX "MathAttempt_kidId_createdAt_idx" ON "MathAttempt"("kidId", "createdAt");

-- CreateIndex
CREATE INDEX "MathAttempt_kidId_questionType_idx" ON "MathAttempt"("kidId", "questionType");

-- CreateIndex
CREATE UNIQUE INDEX "MathSettings_familyId_key" ON "MathSettings"("familyId");

-- CreateIndex
CREATE INDEX "BadgeTemplate_familyId_idx" ON "BadgeTemplate"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeTemplate_familyId_builtInBadgeId_key" ON "BadgeTemplate"("familyId", "builtInBadgeId");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeTemplate_familyId_choreId_type_key" ON "BadgeTemplate"("familyId", "choreId", "type");

-- CreateIndex
CREATE INDEX "WeeklyPlan_familyId_idx" ON "WeeklyPlan"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyPlan_familyId_weekStart_key" ON "WeeklyPlan"("familyId", "weekStart");

-- CreateIndex
CREATE INDEX "PlannedMeal_planId_idx" ON "PlannedMeal"("planId");

-- CreateIndex
CREATE INDEX "PlannedMeal_dishId_idx" ON "PlannedMeal"("dishId");

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Badge" ADD CONSTRAINT "Badge_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementBadge" ADD CONSTRAINT "AchievementBadge_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AchievementBadge" ADD CONSTRAINT "AchievementBadge_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SightWord" ADD CONSTRAINT "SightWord_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SightWord" ADD CONSTRAINT "SightWord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SightWord" ADD CONSTRAINT "SightWord_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SightWordProgress" ADD CONSTRAINT "SightWordProgress_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SightWordProgress" ADD CONSTRAINT "SightWordProgress_sightWordId_fkey" FOREIGN KEY ("sightWordId") REFERENCES "SightWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathAttempt" ADD CONSTRAINT "MathAttempt_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MathSettings" ADD CONSTRAINT "MathSettings_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeTemplate" ADD CONSTRAINT "BadgeTemplate_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_cookedById_fkey" FOREIGN KEY ("cookedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyPlan" ADD CONSTRAINT "WeeklyPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WeeklyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedMeal" ADD CONSTRAINT "PlannedMeal_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;

