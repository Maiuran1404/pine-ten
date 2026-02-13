import * as dotenv from 'dotenv'

// Load environment variables first
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function migrate() {
  const { db } = await import('./index')
  const { sql } = await import('drizzle-orm')

  console.log('Creating style_selection_history table...')

  try {
    // Create table if not exists
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "style_selection_history" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL,
        "style_id" uuid NOT NULL,
        "deliverable_type" text NOT NULL,
        "style_axis" text NOT NULL,
        "selection_context" text DEFAULT 'chat' NOT NULL,
        "was_confirmed" boolean DEFAULT false NOT NULL,
        "draft_id" uuid,
        "created_at" timestamp DEFAULT now() NOT NULL
      )
    `)
    console.log('Table created')

    // Add foreign keys (ignore if already exist)
    try {
      await db.execute(sql`
        ALTER TABLE "style_selection_history"
        ADD CONSTRAINT "style_selection_history_user_id_users_id_fk"
        FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
      `)
      console.log('FK 1 added')
    } catch {
      console.log('FK 1 already exists')
    }

    try {
      await db.execute(sql`
        ALTER TABLE "style_selection_history"
        ADD CONSTRAINT "style_selection_history_style_id_deliverable_style_references_id_fk"
        FOREIGN KEY ("style_id") REFERENCES "deliverable_style_references"("id") ON DELETE cascade
      `)
      console.log('FK 2 added')
    } catch {
      console.log('FK 2 already exists')
    }

    try {
      await db.execute(sql`
        ALTER TABLE "style_selection_history"
        ADD CONSTRAINT "style_selection_history_draft_id_chat_drafts_id_fk"
        FOREIGN KEY ("draft_id") REFERENCES "chat_drafts"("id") ON DELETE set null
      `)
      console.log('FK 3 added')
    } catch {
      console.log('FK 3 already exists')
    }

    // Create indexes
    try {
      await db.execute(sql`CREATE INDEX "ssh_user_id_idx" ON "style_selection_history" ("user_id")`)
      console.log('Index 1 created')
    } catch {
      console.log('Index 1 already exists')
    }

    try {
      await db.execute(
        sql`CREATE INDEX "ssh_user_style_idx" ON "style_selection_history" ("user_id", "style_axis")`
      )
      console.log('Index 2 created')
    } catch {
      console.log('Index 2 already exists')
    }

    try {
      await db.execute(
        sql`CREATE INDEX "ssh_user_type_idx" ON "style_selection_history" ("user_id", "deliverable_type")`
      )
      console.log('Index 3 created')
    } catch {
      console.log('Index 3 already exists')
    }

    console.log('\nMigration complete!')
  } catch (error) {
    console.error('Error:', error)
  }

  process.exit(0)
}

migrate()
