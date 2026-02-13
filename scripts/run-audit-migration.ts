import * as dotenv from 'dotenv'

// Load environment variables first
dotenv.config({ path: '.env' })
dotenv.config({ path: '.env.local' })

async function runMigration() {
  // Dynamic imports to ensure env is loaded first
  const { db } = await import('../src/db')
  const { sql } = await import('drizzle-orm')
  try {
    // Create enum type
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE "public"."audit_action_type" AS ENUM(
          'AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_FAILED_LOGIN', 'AUTH_PASSWORD_CHANGE',
          'AUTH_2FA_ENABLED', 'AUTH_2FA_DISABLED', 'USER_CREATE', 'USER_UPDATE',
          'USER_DELETE', 'USER_ROLE_CHANGE', 'FREELANCER_APPROVE', 'FREELANCER_REJECT',
          'FREELANCER_SUSPEND', 'FREELANCER_BULK_ACTION', 'TASK_CREATE', 'TASK_ASSIGN',
          'TASK_STATUS_CHANGE', 'TASK_DELETE', 'CREDIT_PURCHASE', 'CREDIT_USAGE',
          'CREDIT_REFUND', 'CREDIT_MANUAL_ADJUST', 'SETTINGS_UPDATE', 'COUPON_CREATE',
          'COUPON_DELETE', 'ADMIN_DATABASE_ACCESS', 'ADMIN_EXPORT_DATA',
          'ADMIN_IMPERSONATE', 'SECURITY_TEST_RUN', 'SECURITY_ALERT'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    console.log('Created enum type')

    // Create table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "actor_id" text,
        "actor_email" text,
        "actor_role" text,
        "action" "audit_action_type" NOT NULL,
        "resource_type" text NOT NULL,
        "resource_id" text,
        "details" jsonb,
        "previous_value" jsonb,
        "new_value" jsonb,
        "success" boolean DEFAULT true NOT NULL,
        "error_message" text,
        "ip_address" text,
        "user_agent" text,
        "endpoint" text,
        "created_at" timestamp DEFAULT now() NOT NULL
      );
    `)
    console.log('Created table')

    // Add foreign key (ignore if exists)
    await db.execute(sql`
      DO $$ BEGIN
        ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk"
        FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `)
    console.log('Added foreign key')

    // Create indexes
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "audit_logs_action_idx" ON "audit_logs" USING btree ("action");`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "audit_logs_resource_id_idx" ON "audit_logs" USING btree ("resource_id");`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");`
    )
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS "audit_logs_actor_action_idx" ON "audit_logs" USING btree ("actor_id","action");`
    )
    console.log('Created indexes')

    console.log('Migration completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  }
}

runMigration()
