/**
 * Sync production Neon database into local PGlite.
 *
 * Usage: node scripts/sync-prod-to-pglite.mjs
 *
 * Reads DATABASE_URL from .env.prod, dumps all data,
 * recreates PGlite at ./pglite/dev, and inserts everything.
 */

import pg from "pg";
import { PGlite } from "@electric-sql/pglite";
import { execSync } from "child_process";
import { existsSync, rmSync, readFileSync } from "fs";
import { resolve } from "path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");
const PGLITE_DIR = resolve(PROJECT_ROOT, "pglite/dev");

// Parse .env.prod for DATABASE_URL
function getProdDatabaseUrl() {
  const envPath = resolve(PROJECT_ROOT, ".env.prod");
  if (!existsSync(envPath)) {
    throw new Error(".env.prod not found — run: npx vercel env pull .env.prod --environment production");
  }
  const content = readFileSync(envPath, "utf-8");
  const match = content.match(/^DATABASE_URL="([^"]+)"/m);
  if (!match) throw new Error("DATABASE_URL not found in .env.prod");
  return match[1];
}

// Get all user tables in dependency-safe order (parents first)
// We'll disable FK checks in PGlite instead for simplicity
async function getAllTables(client) {
  const res = await client.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '_prisma%'
    ORDER BY tablename
  `);
  return res.rows.map((r) => r.tablename);
}

// Dump a single table's data
async function dumpTable(client, table) {
  const res = await client.query(`SELECT * FROM "${table}"`);
  return res.rows;
}

// Escape a value for SQL INSERT
function escapeSqlValue(val) {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (Array.isArray(val)) {
    // PostgreSQL array literal
    const items = val.map((v) =>
      typeof v === "string" ? `"${v.replace(/"/g, '\\"')}"` : String(v)
    );
    return `'{${items.join(",")}}'`;
  }
  if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
  // String
  return `'${String(val).replace(/'/g, "''")}'`;
}

// Build INSERT statements for a table
function buildInserts(table, rows) {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const colList = columns.map((c) => `"${c}"`).join(", ");
  const statements = [];

  for (const row of rows) {
    const values = columns.map((c) => escapeSqlValue(row[c])).join(", ");
    statements.push(`INSERT INTO "${table}" (${colList}) VALUES (${values});`);
  }

  return statements.join("\n");
}

async function main() {
  const prodUrl = getProdDatabaseUrl();
  console.log("📡 Connecting to production Neon database...");

  const client = new pg.Client({ connectionString: prodUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = await getAllTables(client);
  console.log(`📋 Found ${tables.length} tables: ${tables.join(", ")}`);

  // Dump all data
  const tableData = {};
  let totalRows = 0;
  for (const table of tables) {
    const rows = await dumpTable(client, table);
    tableData[table] = rows;
    totalRows += rows.length;
    if (rows.length > 0) {
      console.log(`  ✓ ${table}: ${rows.length} rows`);
    }
  }
  await client.end();
  console.log(`\n📦 Total: ${totalRows} rows across ${tables.length} tables`);

  // Recreate PGlite
  console.log("\n🗑️  Removing old PGlite data...");
  if (existsSync(PGLITE_DIR)) {
    rmSync(PGLITE_DIR, { recursive: true, force: true });
  }

  console.log("🔧 Creating fresh PGlite database...");
  const pglite = new PGlite(PGLITE_DIR);

  // Generate schema SQL from Prisma
  console.log("📐 Generating schema from Prisma...");
  const schemaSql = execSync(
    "DATABASE_URL=postgresql://localhost npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script",
    { encoding: "utf-8", cwd: PROJECT_ROOT }
  );
  await pglite.exec(schemaSql);
  console.log("  ✓ Schema created");

  // Insert data with FK checks deferred
  console.log("\n📥 Importing data...");
  
  // Disable all triggers (including FK checks) during import
  await pglite.exec("SET session_replication_role = 'replica';");

  for (const table of tables) {
    const rows = tableData[table];
    if (rows.length === 0) continue;

    const sql = buildInserts(table, rows);
    try {
      await pglite.exec(sql);
      console.log(`  ✓ ${table}: ${rows.length} rows imported`);
    } catch (err) {
      console.error(`  ✗ ${table}: ${err.message}`);
      // Try row by row for debugging
      let ok = 0, fail = 0;
      const columns = Object.keys(rows[0]);
      const colList = columns.map((c) => `"${c}"`).join(", ");
      for (const row of rows) {
        const values = columns.map((c) => escapeSqlValue(row[c])).join(", ");
        try {
          await pglite.exec(`INSERT INTO "${table}" (${colList}) VALUES (${values});`);
          ok++;
        } catch (e) {
          fail++;
          if (fail <= 3) console.error(`    Row error: ${e.message.slice(0, 120)}`);
        }
      }
      console.log(`    → ${ok} ok, ${fail} failed`);
    }
  }

  // Re-enable FK checks
  await pglite.exec("SET session_replication_role = 'origin';");

  await pglite.close();
  console.log("\n✅ Done! Production data loaded into PGlite at ./pglite/dev");
  console.log("   Run `npm run dev` to start with local data.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
