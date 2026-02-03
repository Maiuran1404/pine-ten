#!/usr/bin/env npx tsx
/**
 * Add task_summary column to briefs table
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: "require",
});

async function main() {
  console.log("Running migration to add task_summary column...");

  try {
    await sql`
      ALTER TABLE "briefs"
      ADD COLUMN IF NOT EXISTS "task_summary" jsonb;
    `;
    console.log("✓ Added task_summary column to briefs table");

    console.log("\n✅ Migration complete!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
