-- AlterTable: Add `forceShow` flag to BadgeTemplate. Combined with the
-- existing `hidden` flag this gives a tri-state visibility model:
--   hidden=false, forceShow=false → AUTO (progressive disclosure)
--   hidden=true                   → HIDDEN (override)
--   forceShow=true                → SHOWN (override, bypass tier gate)
-- hidden wins if both are true. Default false preserves prior behavior.
ALTER TABLE "BadgeTemplate" ADD COLUMN "forceShow" BOOLEAN NOT NULL DEFAULT false;
