-- CreateEnum
CREATE TYPE "PhotoProvider" AS ENUM ('NONE', 'VERCEL_BLOB', 'GOOGLE_DRIVE');

-- AlterTable: add the column with a safe default for new families.
ALTER TABLE "Family" ADD COLUMN "photoProvider" "PhotoProvider" NOT NULL DEFAULT 'NONE';

-- Backfill: families that existed before this migration have been using
-- Vercel Blob storage (the only path that existed). Mark them VERCEL_BLOB
-- so their photo upload keeps working. Any newly-created family after
-- this migration starts at NONE (photos disabled) until an explicit
-- provider is configured.
UPDATE "Family" SET "photoProvider" = 'VERCEL_BLOB';
