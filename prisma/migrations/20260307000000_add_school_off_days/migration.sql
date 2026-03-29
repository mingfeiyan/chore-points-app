-- CreateTable
CREATE TABLE "SchoolOff" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolOff_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolOff_familyId_idx" ON "SchoolOff"("familyId");
CREATE INDEX "SchoolOff_familyId_date_idx" ON "SchoolOff"("familyId", "date");
CREATE UNIQUE INDEX "SchoolOff_familyId_date_key" ON "SchoolOff"("familyId", "date");

-- AddForeignKey
ALTER TABLE "SchoolOff" ADD CONSTRAINT "SchoolOff_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;
