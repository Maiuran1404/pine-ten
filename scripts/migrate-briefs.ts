import * as fs from "fs";
import * as path from "path";
import postgres from "postgres";

// Read .env.local file manually
const envPath = path.join(process.cwd(), ".env.local");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envVars[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
  }
});

const DATABASE_URL = envVars.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error("DATABASE_URL not found in .env.local");
}

const sql = postgres(DATABASE_URL);

async function migrate() {
  console.log("Starting migration...");

  try {
    // Check if brief_status enum exists
    const enumExists = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_type WHERE typname = 'brief_status'
      );
    `;

    if (!enumExists[0].exists) {
      console.log("Creating brief_status enum...");
      await sql`
        CREATE TYPE "public"."brief_status" AS ENUM('DRAFT', 'READY', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED');
      `;
    } else {
      console.log("brief_status enum already exists");
    }

    // Check if audiences table exists
    const audiencesExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'audiences'
      );
    `;

    if (!audiencesExists[0].exists) {
      console.log("Creating audiences table...");
      await sql`
        CREATE TABLE "audiences" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "company_id" uuid NOT NULL,
          "name" text NOT NULL,
          "is_primary" boolean DEFAULT false NOT NULL,
          "demographics" jsonb,
          "firmographics" jsonb,
          "psychographics" jsonb,
          "behavioral" jsonb,
          "confidence" integer DEFAULT 50 NOT NULL,
          "sources" jsonb DEFAULT '[]'::jsonb,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `;
      await sql`
        ALTER TABLE "audiences" ADD CONSTRAINT "audiences_company_id_companies_id_fk"
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
      `;
      await sql`CREATE INDEX "audiences_company_id_idx" ON "audiences" USING btree ("company_id");`;
      await sql`CREATE INDEX "audiences_is_primary_idx" ON "audiences" USING btree ("company_id","is_primary");`;
      console.log("Audiences table created");
    } else {
      console.log("audiences table already exists");
    }

    // Check if briefs table exists
    const briefsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'briefs'
      );
    `;

    if (!briefsExists[0].exists) {
      console.log("Creating briefs table...");
      await sql`
        CREATE TABLE "briefs" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "user_id" text NOT NULL,
          "company_id" uuid,
          "draft_id" uuid,
          "task_id" uuid,
          "status" "brief_status" DEFAULT 'DRAFT' NOT NULL,
          "completion_percentage" integer DEFAULT 0 NOT NULL,
          "topic" jsonb,
          "platform" jsonb,
          "content_type" jsonb,
          "intent" jsonb,
          "task_type" jsonb,
          "audience" jsonb,
          "dimensions" jsonb,
          "visual_direction" jsonb,
          "content_outline" jsonb,
          "brand_context" jsonb,
          "clarifying_questions_asked" jsonb DEFAULT '[]'::jsonb,
          "created_at" timestamp DEFAULT now() NOT NULL,
          "updated_at" timestamp DEFAULT now() NOT NULL
        );
      `;

      console.log("Adding foreign keys...");
      await sql`
        ALTER TABLE "briefs" ADD CONSTRAINT "briefs_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
      `;
      await sql`
        ALTER TABLE "briefs" ADD CONSTRAINT "briefs_company_id_companies_id_fk"
        FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;
      `;
      await sql`
        ALTER TABLE "briefs" ADD CONSTRAINT "briefs_draft_id_chat_drafts_id_fk"
        FOREIGN KEY ("draft_id") REFERENCES "public"."chat_drafts"("id") ON DELETE set null ON UPDATE no action;
      `;
      await sql`
        ALTER TABLE "briefs" ADD CONSTRAINT "briefs_task_id_tasks_id_fk"
        FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;
      `;

      console.log("Creating indexes...");
      await sql`CREATE INDEX "briefs_user_id_idx" ON "briefs" USING btree ("user_id");`;
      await sql`CREATE INDEX "briefs_company_id_idx" ON "briefs" USING btree ("company_id");`;
      await sql`CREATE INDEX "briefs_draft_id_idx" ON "briefs" USING btree ("draft_id");`;
      await sql`CREATE INDEX "briefs_task_id_idx" ON "briefs" USING btree ("task_id");`;
      await sql`CREATE INDEX "briefs_status_idx" ON "briefs" USING btree ("status");`;
      await sql`CREATE INDEX "briefs_created_at_idx" ON "briefs" USING btree ("created_at");`;

      console.log("Briefs table created successfully!");
    } else {
      console.log("briefs table already exists");
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    throw error;
  } finally {
    await sql.end();
  }
}

migrate();
