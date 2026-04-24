-- AlterTable: track which parent connected Drive so server-side Drive API
-- calls (uploads, file proxy) can consistently use that parent's OAuth
-- token, even when a different parent (or a kid, via the proxy) initiated
-- the request. If that parent revokes or disconnects, the family would
-- re-connect and this column is updated.
ALTER TABLE "Family" ADD COLUMN "googleDriveConnectedById" TEXT;
