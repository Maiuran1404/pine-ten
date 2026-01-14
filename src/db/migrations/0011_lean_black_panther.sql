CREATE TYPE "public"."security_test_run_status" AS ENUM('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."security_test_status" AS ENUM('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'ERROR', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."test_schedule_frequency" AS ENUM('MANUAL', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TABLE "security_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"overall_score" numeric(5, 2),
	"category_scores" jsonb,
	"ssl_valid" boolean,
	"ssl_expiry" timestamp,
	"headers_score" numeric(5, 2),
	"missing_headers" jsonb,
	"dependency_vulnerabilities" jsonb,
	"env_exposed" boolean,
	"debug_enabled" boolean,
	"open_endpoints" jsonb,
	"rate_limiting_enabled" boolean,
	"critical_issues" integer DEFAULT 0 NOT NULL,
	"high_issues" integer DEFAULT 0 NOT NULL,
	"medium_issues" integer DEFAULT 0 NOT NULL,
	"low_issues" integer DEFAULT 0 NOT NULL,
	"last_test_run_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_test_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"test_id" uuid NOT NULL,
	"status" "security_test_status" DEFAULT 'PENDING' NOT NULL,
	"error_message" text,
	"stack_trace" text,
	"findings" jsonb,
	"screenshots" jsonb DEFAULT '[]'::jsonb,
	"console_errors" jsonb DEFAULT '[]'::jsonb,
	"network_errors" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_test_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid,
	"triggered_by" text,
	"status" "security_test_run_status" DEFAULT 'PENDING' NOT NULL,
	"target_url" text NOT NULL,
	"environment" text DEFAULT 'production' NOT NULL,
	"test_user_id" uuid,
	"total_tests" integer DEFAULT 0 NOT NULL,
	"passed_tests" integer DEFAULT 0 NOT NULL,
	"failed_tests" integer DEFAULT 0 NOT NULL,
	"error_tests" integer DEFAULT 0 NOT NULL,
	"skipped_tests" integer DEFAULT 0 NOT NULL,
	"score" numeric(5, 2),
	"started_at" timestamp,
	"completed_at" timestamp,
	"duration_ms" integer,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_tests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"test_type" text NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"test_flow" jsonb,
	"exploratory_config" jsonb,
	"expected_outcome" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"frequency" "test_schedule_frequency" DEFAULT 'DAILY' NOT NULL,
	"cron_expression" text,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"test_ids" jsonb DEFAULT '[]'::jsonb,
	"categories" jsonb DEFAULT '[]'::jsonb,
	"test_user_id" uuid,
	"target_environment" text DEFAULT 'production' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_run_at" timestamp,
	"next_run_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"credentials" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "brand_references" ADD COLUMN "density_bucket" text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE "brand_references" ADD COLUMN "premium_bucket" text DEFAULT 'balanced' NOT NULL;--> statement-breakpoint
ALTER TABLE "security_snapshots" ADD CONSTRAINT "security_snapshots_last_test_run_id_security_test_runs_id_fk" FOREIGN KEY ("last_test_run_id") REFERENCES "public"."security_test_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_test_results" ADD CONSTRAINT "security_test_results_run_id_security_test_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."security_test_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_test_results" ADD CONSTRAINT "security_test_results_test_id_security_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."security_tests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_test_runs" ADD CONSTRAINT "security_test_runs_schedule_id_test_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."test_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_test_runs" ADD CONSTRAINT "security_test_runs_test_user_id_test_users_id_fk" FOREIGN KEY ("test_user_id") REFERENCES "public"."test_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_schedules" ADD CONSTRAINT "test_schedules_test_user_id_test_users_id_fk" FOREIGN KEY ("test_user_id") REFERENCES "public"."test_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "security_snapshots_created_at_idx" ON "security_snapshots" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "security_test_results_run_id_idx" ON "security_test_results" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "security_test_results_test_id_idx" ON "security_test_results" USING btree ("test_id");--> statement-breakpoint
CREATE INDEX "security_test_results_status_idx" ON "security_test_results" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_test_runs_status_idx" ON "security_test_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "security_test_runs_created_at_idx" ON "security_test_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "security_test_runs_schedule_id_idx" ON "security_test_runs" USING btree ("schedule_id");