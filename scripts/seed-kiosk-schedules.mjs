/**
 * Seed kiosk schedule values into the local PGlite database.
 *
 * Usage: node scripts/seed-kiosk-schedules.mjs
 *
 * This script:
 * 1. Adds the `schedule` column to the Chore table (idempotent)
 * 2. Sets schedule = 'morning' | 'evening' | 'weekly' on matching chores
 * 3. Deactivates one-off chores
 */

import { PGlite } from "@electric-sql/pglite";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const PGLITE_DIR = resolve(PROJECT_ROOT, "pglite/dev");

async function main() {
  console.log("📂 Opening PGlite at:", PGLITE_DIR);
  const db = new PGlite(PGLITE_DIR);

  // Step 1: Add schedule column if it doesn't exist
  console.log("🔧 Adding schedule column (if not exists)...");
  await db.exec(`ALTER TABLE "Chore" ADD COLUMN IF NOT EXISTS "schedule" TEXT;`);
  console.log("  ✓ Column ready");

  // Step 2: Set morning schedule
  const morningChores = [
    "早上起床后尿尿",
    "早上自己穿衣服",
    "穿鞋",
    "安全带",
  ];
  for (const title of morningChores) {
    const res = await db.query(
      `UPDATE "Chore" SET schedule = 'morning' WHERE title = $1`,
      [title]
    );
    console.log(`  🌅 morning: "${title}" → ${res.affectedRows ?? 0} row(s)`);
  }

  // Step 3: Set evening schedule (LIKE patterns)
  const eveningPatterns = [
    "回家先洗手%",
    "洗澡%",
    "刷牙%",
    "睡觉前撒尿%",
    "9点前睡觉%",
    "自己睡%",
  ];
  for (const pattern of eveningPatterns) {
    const res = await db.query(
      `UPDATE "Chore" SET schedule = 'evening' WHERE title LIKE $1`,
      [pattern]
    );
    console.log(`  🌙 evening: "${pattern}" → ${res.affectedRows ?? 0} row(s)`);
  }

  // Step 4: Set weekly schedule (LIKE patterns)
  const weeklyPatterns = ["中文课%", "体操课%", "武术课%"];
  for (const pattern of weeklyPatterns) {
    const res = await db.query(
      `UPDATE "Chore" SET schedule = 'weekly' WHERE title LIKE $1`,
      [pattern]
    );
    console.log(`  📅 weekly: "${pattern}" → ${res.affectedRows ?? 0} row(s)`);
  }

  // Step 5: Deactivate one-off chores
  const deactivatePatterns = ["做三明治%", "吃药%", "牙医%", "端盘子%"];
  for (const pattern of deactivatePatterns) {
    const res = await db.query(
      `UPDATE "Chore" SET "isActive" = false WHERE title LIKE $1`,
      [pattern]
    );
    console.log(`  ❌ deactivate: "${pattern}" → ${res.affectedRows ?? 0} row(s)`);
  }

  // Show current state
  const chores = await db.query(
    `SELECT title, schedule, "isActive" FROM "Chore" WHERE schedule IS NOT NULL OR "isActive" = false ORDER BY schedule, title`
  );
  console.log("\n📋 Scheduled chores:");
  for (const row of chores.rows) {
    const status = row.isActive ? "✅" : "❌";
    console.log(`  ${status} [${row.schedule ?? "none"}] ${row.title}`);
  }

  await db.close();
  console.log("\n✅ Done — kiosk schedules seeded.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
