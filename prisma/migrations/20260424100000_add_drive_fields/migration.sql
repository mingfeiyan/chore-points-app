-- AlterTable: Family gets Drive-connection bookkeeping columns.
ALTER TABLE "Family" ADD COLUMN "googleDriveFolderId" TEXT;
ALTER TABLE "Family" ADD COLUMN "googleDriveConnectedAt" TIMESTAMP(3);

-- AlterTable: Photo gets an optional Drive file ID. Existing Vercel Blob
-- photos keep photoUrl and leave driveFileId null; Drive-hosted photos
-- store the Drive file ID and populate photoUrl with a webContentLink
-- (or signed thumbnail, refreshed on access).
ALTER TABLE "Photo" ADD COLUMN "driveFileId" TEXT;
