-- CreateTable
CREATE TABLE "DailyMealLog" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMealLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMeal" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyMealDish" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "dishId" TEXT,
    "dishName" TEXT NOT NULL,
    "isFreeForm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyMealDish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyItem" (
    "id" TEXT NOT NULL,
    "dailyLogId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "weekStart" DATE NOT NULL,
    "weeklyStaples" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiRecommendation" TEXT,
    "aiGeneratedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedDayMeal" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "mealType" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedDayMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedDayMealDish" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "dishId" TEXT,
    "dishName" TEXT NOT NULL,
    "isFreeForm" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlannedDayMealDish_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyMealLog_familyId_idx" ON "DailyMealLog"("familyId");

-- CreateIndex
CREATE INDEX "DailyMealLog_familyId_date_idx" ON "DailyMealLog"("familyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyMealLog_familyId_date_key" ON "DailyMealLog"("familyId", "date");

-- CreateIndex
CREATE INDEX "DailyMeal_dailyLogId_idx" ON "DailyMeal"("dailyLogId");

-- CreateIndex
CREATE INDEX "DailyMealDish_mealId_idx" ON "DailyMealDish"("mealId");

-- CreateIndex
CREATE INDEX "DailyMealDish_dishId_idx" ON "DailyMealDish"("dishId");

-- CreateIndex
CREATE INDEX "DailyItem_dailyLogId_idx" ON "DailyItem"("dailyLogId");

-- CreateIndex
CREATE INDEX "MealPlan_familyId_idx" ON "MealPlan"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPlan_familyId_weekStart_key" ON "MealPlan"("familyId", "weekStart");

-- CreateIndex
CREATE INDEX "PlannedDay_planId_idx" ON "PlannedDay"("planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlannedDay_planId_date_key" ON "PlannedDay"("planId", "date");

-- CreateIndex
CREATE INDEX "PlannedDayMeal_dayId_idx" ON "PlannedDayMeal"("dayId");

-- CreateIndex
CREATE INDEX "PlannedDayMealDish_mealId_idx" ON "PlannedDayMealDish"("mealId");

-- CreateIndex
CREATE INDEX "PlannedDayMealDish_dishId_idx" ON "PlannedDayMealDish"("dishId");

-- AddForeignKey
ALTER TABLE "DailyMealLog" ADD CONSTRAINT "DailyMealLog_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMeal" ADD CONSTRAINT "DailyMeal_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyMealLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMealDish" ADD CONSTRAINT "DailyMealDish_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "DailyMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyMealDish" ADD CONSTRAINT "DailyMealDish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyItem" ADD CONSTRAINT "DailyItem_dailyLogId_fkey" FOREIGN KEY ("dailyLogId") REFERENCES "DailyMealLog"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedDay" ADD CONSTRAINT "PlannedDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedDayMeal" ADD CONSTRAINT "PlannedDayMeal_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "PlannedDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedDayMealDish" ADD CONSTRAINT "PlannedDayMealDish_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "PlannedDayMeal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedDayMealDish" ADD CONSTRAINT "PlannedDayMealDish_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
