-- CreateTable (was missing — CustomMathQuestion was added to schema without a migration)
CREATE TABLE "CustomMathQuestion" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" INTEGER NOT NULL,
    "questionType" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "scheduledDate" TEXT,
    "kidId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomMathQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomMathQuestion_familyId_idx" ON "CustomMathQuestion"("familyId");

-- CreateIndex
CREATE INDEX "CustomMathQuestion_familyId_isActive_idx" ON "CustomMathQuestion"("familyId", "isActive");

-- CreateIndex
CREATE INDEX "CustomMathQuestion_familyId_kidId_scheduledDate_idx" ON "CustomMathQuestion"("familyId", "kidId", "scheduledDate");

-- AddForeignKey
ALTER TABLE "CustomMathQuestion" ADD CONSTRAINT "CustomMathQuestion_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomMathQuestion" ADD CONSTRAINT "CustomMathQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomMathQuestion" ADD CONSTRAINT "CustomMathQuestion_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
