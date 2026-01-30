/**
 * Apply Slack migration directly
 * Run with: npx tsx scripts/migrate-slack.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL as string, {
  ssl: "require",
  max: 1,
});

async function migrate() {
  console.log("Applying Slack migration...\n");

  try {
    // Add slack columns to companies table
    await sql`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "slack_channel_id" text`;
    console.log("✅ Added slack_channel_id to companies");

    await sql`ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "slack_channel_name" text`;
    console.log("✅ Added slack_channel_name to companies");

    // Add slack columns to users table
    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "slack_user_id" text`;
    console.log("✅ Added slack_user_id to users");

    await sql`ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "slack_dm_channel_id" text`;
    console.log("✅ Added slack_dm_channel_id to users");

    console.log("\n✨ Slack migration complete!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

migrate();
