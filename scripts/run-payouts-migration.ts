#!/usr/bin/env npx tsx
/**
 * Run migration for payouts and stripe_connect_accounts tables
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

import postgres from 'postgres'

const sql = postgres(process.env.DATABASE_URL!, {
  ssl: 'require',
})

async function main() {
  console.log('Running payouts migration...')

  try {
    // Create payout_status enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✓ Created payout_status enum')

    // Create payout_method enum
    await sql`
      DO $$ BEGIN
        CREATE TYPE "public"."payout_method" AS ENUM('STRIPE_CONNECT', 'BANK_TRANSFER', 'PAYPAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✓ Created payout_method enum')

    // Create payouts table
    await sql`
      CREATE TABLE IF NOT EXISTS "payouts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "freelancer_id" text NOT NULL,
        "credits_amount" integer NOT NULL,
        "gross_amount_usd" numeric(10, 2) NOT NULL,
        "platform_fee_usd" numeric(10, 2) NOT NULL,
        "net_amount_usd" numeric(10, 2) NOT NULL,
        "artist_percentage" integer NOT NULL,
        "status" "payout_status" DEFAULT 'PENDING' NOT NULL,
        "payout_method" "payout_method",
        "stripe_connect_account_id" text,
        "stripe_transfer_id" text,
        "stripe_payout_id" text,
        "processed_at" timestamp,
        "failure_reason" text,
        "requested_at" timestamp DEFAULT now() NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `
    console.log('✓ Created payouts table')

    // Create stripe_connect_accounts table
    await sql`
      CREATE TABLE IF NOT EXISTS "stripe_connect_accounts" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "freelancer_id" text NOT NULL UNIQUE,
        "stripe_account_id" text NOT NULL UNIQUE,
        "charges_enabled" boolean DEFAULT false NOT NULL,
        "payouts_enabled" boolean DEFAULT false NOT NULL,
        "details_submitted" boolean DEFAULT false NOT NULL,
        "account_type" text DEFAULT 'express' NOT NULL,
        "country" text,
        "default_currency" text,
        "external_account_last4" text,
        "external_account_type" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `
    console.log('✓ Created stripe_connect_accounts table')

    // Add foreign keys
    await sql`
      DO $$ BEGIN
        ALTER TABLE "payouts"
        ADD CONSTRAINT "payouts_freelancer_id_users_id_fk"
        FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✓ Added payouts foreign key')

    await sql`
      DO $$ BEGIN
        ALTER TABLE "stripe_connect_accounts"
        ADD CONSTRAINT "stripe_connect_accounts_freelancer_id_users_id_fk"
        FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id")
        ON DELETE cascade ON UPDATE no action;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `
    console.log('✓ Added stripe_connect_accounts foreign key')

    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS "payouts_freelancer_id_idx" ON "payouts" USING btree ("freelancer_id");`
    await sql`CREATE INDEX IF NOT EXISTS "payouts_status_idx" ON "payouts" USING btree ("status");`
    await sql`CREATE INDEX IF NOT EXISTS "payouts_requested_at_idx" ON "payouts" USING btree ("requested_at");`
    await sql`CREATE INDEX IF NOT EXISTS "stripe_connect_accounts_freelancer_id_idx" ON "stripe_connect_accounts" USING btree ("freelancer_id");`
    await sql`CREATE INDEX IF NOT EXISTS "stripe_connect_accounts_stripe_account_id_idx" ON "stripe_connect_accounts" USING btree ("stripe_account_id");`
    console.log('✓ Created indexes')

    console.log('\n✅ Payouts migration complete!')
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
