/**
 * Migration script: Convert old MealLog entries to new DailyMealLog format
 *
 * Run with: npx tsx scripts/migrate-meal-logs.ts
 */

import { PrismaClient, MealType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function migrateMealLogs() {
  console.log("Starting MealLog -> DailyMealLog migration...\n");

  // Fetch all existing MealLogs with their dish info
  const mealLogs = await prisma.mealLog.findMany({
    include: {
      dish: {
        select: { id: true, name: true },
      },
    },
    orderBy: { date: "asc" },
  });

  console.log(`Found ${mealLogs.length} MealLog entries to migrate\n`);

  if (mealLogs.length === 0) {
    console.log("No MealLog entries to migrate.");
    return;
  }

  // Group by familyId and date
  const grouped = new Map<string, typeof mealLogs>();

  for (const log of mealLogs) {
    // Extract just the date portion (YYYY-MM-DD)
    const dateStr = log.date.toISOString().split("T")[0];
    const key = `${log.familyId}|${dateStr}`;

    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(log);
  }

  console.log(`Grouped into ${grouped.size} unique family+date combinations\n`);

  let created = 0;
  let skipped = 0;

  for (const [key, logs] of grouped) {
    const [familyId, dateStr] = key.split("|");
    const date = new Date(`${dateStr}T12:00:00`);

    // Check if DailyMealLog already exists for this date
    const existing = await prisma.dailyMealLog.findUnique({
      where: {
        familyId_date: { familyId, date },
      },
    });

    if (existing) {
      console.log(`  Skipping ${dateStr} for family ${familyId.slice(0, 8)}... (already exists)`);
      skipped++;
      continue;
    }

    // Group logs by meal type
    const byMealType = new Map<MealType, typeof logs>();
    for (const log of logs) {
      if (!byMealType.has(log.mealType)) {
        byMealType.set(log.mealType, []);
      }
      byMealType.get(log.mealType)!.push(log);
    }

    // Convert MealType enum to lowercase string
    const mealTypeToString = (mt: MealType): string => {
      switch (mt) {
        case "BREAKFAST": return "breakfast";
        case "LUNCH": return "lunch";
        case "DINNER": return "dinner";
      }
    };

    // Create the DailyMealLog with nested meals and dishes
    await prisma.dailyMealLog.create({
      data: {
        familyId,
        date,
        meals: {
          create: Array.from(byMealType.entries()).map(([mealType, mealLogs]) => ({
            mealType: mealTypeToString(mealType),
            dishes: {
              create: mealLogs.map((ml) => ({
                dishId: ml.dishId,
                dishName: ml.dish?.name || "Unknown Dish",
                isFreeForm: false,
              })),
            },
          })),
        },
      },
    });

    const mealSummary = Array.from(byMealType.entries())
      .map(([mt, mls]) => `${mt}: ${mls.length} dish(es)`)
      .join(", ");

    console.log(`  Created ${dateStr}: ${mealSummary}`);
    created++;
  }

  console.log(`\n========================================`);
  console.log(`Migration complete!`);
  console.log(`  Created: ${created} DailyMealLog entries`);
  console.log(`  Skipped: ${skipped} (already existed)`);
  console.log(`========================================\n`);
}

async function main() {
  try {
    await migrateMealLogs();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
