-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "kidId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "imageUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Milestone_familyId_idx" ON "Milestone"("familyId");

-- CreateIndex
CREATE INDEX "Milestone_kidId_idx" ON "Milestone"("kidId");

-- CreateIndex
CREATE INDEX "Milestone_familyId_kidId_idx" ON "Milestone"("familyId", "kidId");

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_kidId_fkey" FOREIGN KEY ("kidId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
