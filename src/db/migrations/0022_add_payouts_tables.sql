CREATE TYPE "public"."payout_method" AS ENUM('STRIPE_CONNECT', 'BANK_TRANSFER', 'PAYPAL');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "payouts" (
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
--> statement-breakpoint
CREATE TABLE "stripe_connect_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"freelancer_id" text NOT NULL,
	"stripe_account_id" text NOT NULL,
	"charges_enabled" boolean DEFAULT false NOT NULL,
	"payouts_enabled" boolean DEFAULT false NOT NULL,
	"details_submitted" boolean DEFAULT false NOT NULL,
	"account_type" text DEFAULT 'express' NOT NULL,
	"country" text,
	"default_currency" text,
	"external_account_last4" text,
	"external_account_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stripe_connect_accounts_freelancer_id_unique" UNIQUE("freelancer_id"),
	CONSTRAINT "stripe_connect_accounts_stripe_account_id_unique" UNIQUE("stripe_account_id")
);
--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_freelancer_id_users_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stripe_connect_accounts" ADD CONSTRAINT "stripe_connect_accounts_freelancer_id_users_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payouts_freelancer_id_idx" ON "payouts" USING btree ("freelancer_id");--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payouts_requested_at_idx" ON "payouts" USING btree ("requested_at");--> statement-breakpoint
CREATE INDEX "stripe_connect_accounts_freelancer_id_idx" ON "stripe_connect_accounts" USING btree ("freelancer_id");--> statement-breakpoint
CREATE INDEX "stripe_connect_accounts_stripe_account_id_idx" ON "stripe_connect_accounts" USING btree ("stripe_account_id");