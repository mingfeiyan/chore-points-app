-- AlterTable: Add `hidden` flag to BadgeTemplate so parents can stage
-- which badges show up for kids. Default false preserves the existing
-- behavior — every badge is visible until a parent toggles it off.
ALTER TABLE "BadgeTemplate" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;
