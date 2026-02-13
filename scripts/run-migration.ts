#!/usr/bin/env npx tsx
/**
 * Run migration for import_logs table
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
})

async function main() {
  console.log('Running migration...')

  try {
    // Create import_log_source enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."import_log_source" AS ENUM('bigged', 'dribbble', 'manual_url', 'file_upload', 'page_scrape');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✓ Created import_log_source enum')

    // Create import_log_target enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."import_log_target" AS ENUM('deliverable_style', 'brand_reference');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✓ Created import_log_target enum')

    // Create import_logs table
    await sql`
      CREATE TABLE IF NOT EXISTS "import_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "source" "import_log_source" NOT NULL,
        "target" "import_log_target" NOT NULL,
        "triggered_by" text,
        "triggered_by_email" text,
        "search_query" text,
        "source_url" text,
        "total_attempted" integer DEFAULT 0 NOT NULL,
        "total_successful" integer DEFAULT 0 NOT NULL,
        "total_failed" integer DEFAULT 0 NOT NULL,
        "total_skipped" integer DEFAULT 0 NOT NULL,
        "imported_items" jsonb DEFAULT '[]'::jsonb,
        "failed_items" jsonb DEFAULT '[]'::jsonb,
        "skipped_items" jsonb DEFAULT '[]'::jsonb,
        "processing_time_ms" integer,
        "confidence_threshold" numeric(3, 2),
        "status" text DEFAULT 'completed' NOT NULL,
        "error_message" text,
        "started_at" timestamp DEFAULT now() NOT NULL,
        "completed_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `
    console.log('✓ Created import_logs table')

    // Add columns to deliverable_style_references
    await sql`
      ALTER TABLE "deliverable_style_references"
      ADD COLUMN IF NOT EXISTS "image_hash" text;
    `
    console.log('✓ Added image_hash column')

    await sql`
      ALTER TABLE "deliverable_style_references"
      ADD COLUMN IF NOT EXISTS "source_url" text;
    `
    console.log('✓ Added source_url column')

    // Add foreign key
    await sql`
      DO $$ BEGIN
        ALTER TABLE "import_logs"
        ADD CONSTRAINT "import_logs_triggered_by_users_id_fk"
        FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id")
        ON DELETE set null ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✓ Added foreign key constraint')

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS "import_logs_source_idx" ON "import_logs" USING btree ("source");`
    await sql`CREATE INDEX IF NOT EXISTS "import_logs_target_idx" ON "import_logs" USING btree ("target");`
    await sql`CREATE INDEX IF NOT EXISTS "import_logs_triggered_by_idx" ON "import_logs" USING btree ("triggered_by");`
    await sql`CREATE INDEX IF NOT EXISTS "import_logs_created_at_idx" ON "import_logs" USING btree ("created_at");`
    await sql`CREATE INDEX IF NOT EXISTS "import_logs_source_target_idx" ON "import_logs" USING btree ("source","target");`
    console.log('✓ Created indexes')

    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
