CREATE TYPE "public"."waitlist_status" AS ENUM('PENDING', 'INVITED', 'REGISTERED');--> statement-breakpoint
CREATE TABLE "early_access_code_usages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"used_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "early_access_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"max_uses" integer,
	"used_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "early_access_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "early_access_waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"referral_source" text,
	"status" "waitlist_status" DEFAULT 'PENDING' NOT NULL,
	"invited_at" timestamp,
	"registered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "early_access_waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "briefs" ADD COLUMN "task_summary" jsonb;--> statement-breakpoint
ALTER TABLE "early_access_code_usages" ADD CONSTRAINT "early_access_code_usages_code_id_early_access_codes_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."early_access_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "early_access_code_usages" ADD CONSTRAINT "early_access_code_usages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "early_access_codes" ADD CONSTRAINT "early_access_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "early_access_code_usages_code_id_idx" ON "early_access_code_usages" USING btree ("code_id");--> statement-breakpoint
CREATE INDEX "early_access_code_usages_user_id_idx" ON "early_access_code_usages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "early_access_codes_code_idx" ON "early_access_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "early_access_codes_is_active_idx" ON "early_access_codes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "early_access_waitlist_email_idx" ON "early_access_waitlist" USING btree ("email");--> statement-breakpoint
CREATE INDEX "early_access_waitlist_status_idx" ON "early_access_waitlist" USING btree ("status");