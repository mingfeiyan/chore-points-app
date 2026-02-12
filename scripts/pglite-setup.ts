/**
 * Initialize a PGlite database with the Prisma schema.
 *
 * Idempotent — skips if tables already exist or DATABASE_URL is a PostgreSQL server.
 * Called automatically by `npm run dev`.
 */
import { execSync } from "child_process";
import { existsSync, rmSync } from "fs";
import { PGlite } from "@electric-sql/pglite";

async function main() {
  const dataDir = process.env.DATABASE_URL || "./pglite/dev";

  // Skip for real PostgreSQL — use `npx prisma migrate dev` instead
  if (dataDir.startsWith("postgresql://") || dataDir.startsWith("postgres://")) {
    return;
  }

  let client = new PGlite(dataDir);

  // Check if schema is already initialized by looking for critical tables
  try {
    await client.query('SELECT 1 FROM "User" LIMIT 1');
    await client.query('SELECT 1 FROM "Family" LIMIT 1');
    await client.query('SELECT 1 FROM "Chore" LIMIT 1');
    // All critical tables exist — database is already initialized
    await client.close();
    return;
  } catch {
    // Tables don't exist or database is corrupted — delete and recreate
    await client.close();
    if (existsSync(dataDir)) {
      console.log(`Database incomplete or corrupted — removing ${dataDir}`);
      rmSync(dataDir, { recursive: true, force: true });
    }
  }

  console.log(`Initializing PGlite database at: ${dataDir}`);
  client = new PGlite(dataDir);

  // Generate the full schema SQL from Prisma
  const sql = execSync(
    "DATABASE_URL=postgresql://localhost npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
    { encoding: "utf-8" }
  );

  await client.exec(sql);
  await client.close();

  console.log("Done — PGlite database is ready.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
