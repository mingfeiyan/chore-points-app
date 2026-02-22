-- AlterTable
ALTER TABLE "CustomMathQuestion" ADD COLUMN     "kidId" TEXT,
ADD COLUMN     "scheduledDate" TEXT;

-- CreateIndex
CREATE INDEX "CustomMathQuestion_familyId_kidId_scheduledDate_idx" ON "CustomMathQuestion"("familyId", "kidId", "scheduledDate");

-- AddForeignKey
ALTER TABLE "CustomMathQuestion" ADD CONSTRAINT "CustomMathQuestion_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
