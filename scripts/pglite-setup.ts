/**
 * Initialize a PGlite database with the Prisma schema.
 *
 * Idempotent — skips if tables already exist or DATABASE_URL is a PostgreSQL server.
 * Called automatically by `npm run dev`.
 */
import { execSync } from "child_process";
import { PGlite } from "@electric-sql/pglite";

async function main() {
  const dataDir = process.env.DATABASE_URL || "./pglite/dev";

  // Skip for real PostgreSQL — use `npx prisma migrate dev` instead
  if (dataDir.startsWith("postgresql://") || dataDir.startsWith("postgres://")) {
    return;
  }

  const client = new PGlite(dataDir);

  // Check if tables already exist
  const result = await client.query<{ count: string }>(
    "SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'"
  );
  if (Number(result.rows[0].count) > 0) {
    await client.close();
    return;
  }

  console.log(`Initializing PGlite database at: ${dataDir}`);

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
