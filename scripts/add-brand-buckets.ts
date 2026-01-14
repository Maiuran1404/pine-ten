import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { sql } = await import("../src/db/index");

  console.log("Adding density_bucket and premium_bucket columns...");

  // Check if columns exist first
  const checkResult = await sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'brand_references'
    AND column_name IN ('density_bucket', 'premium_bucket')
  `;

  if (checkResult.length >= 2) {
    console.log("Columns already exist!");
    process.exit(0);
  }

  // Add columns if they don't exist
  try {
    await sql`
      ALTER TABLE brand_references
      ADD COLUMN IF NOT EXISTS density_bucket text NOT NULL DEFAULT 'balanced'
    `;
    console.log("Added density_bucket column");
  } catch (e) {
    console.log("density_bucket may already exist");
  }

  try {
    await sql`
      ALTER TABLE brand_references
      ADD COLUMN IF NOT EXISTS premium_bucket text NOT NULL DEFAULT 'balanced'
    `;
    console.log("Added premium_bucket column");
  } catch (e) {
    console.log("premium_bucket may already exist");
  }

  console.log("Done!");
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
