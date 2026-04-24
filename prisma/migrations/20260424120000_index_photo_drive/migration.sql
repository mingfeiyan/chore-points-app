-- The proxy endpoint at /api/drive/file/:id filters Photo by
-- (familyId, driveFileId) on every image render. Add the composite
-- index so the lookup is indexed-scoped instead of a table scan.
CREATE INDEX "Photo_familyId_driveFileId_idx" ON "Photo"("familyId", "driveFileId");
