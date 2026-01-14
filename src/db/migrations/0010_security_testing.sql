-- Security Testing Tables Migration
-- This migration adds tables for comprehensive security testing, scheduling, and reporting

-- Enums
DO $$ BEGIN
  CREATE TYPE "security_test_status" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'ERROR', 'SKIPPED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "security_test_run_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "test_schedule_frequency" AS ENUM ('MANUAL', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Security test definitions
CREATE TABLE IF NOT EXISTS "security_tests" (
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

-- Test users for automated testing
CREATE TABLE IF NOT EXISTS "test_users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "role" text NOT NULL,
  "credentials" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_used_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Test schedules (cadences)
CREATE TABLE IF NOT EXISTS "test_schedules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "frequency" "test_schedule_frequency" DEFAULT 'DAILY' NOT NULL,
  "cron_expression" text,
  "timezone" text DEFAULT 'UTC' NOT NULL,
  "test_ids" jsonb DEFAULT '[]',
  "categories" jsonb DEFAULT '[]',
  "test_user_id" uuid REFERENCES "test_users"("id"),
  "target_environment" text DEFAULT 'production' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "last_run_at" timestamp,
  "next_run_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Security test runs
CREATE TABLE IF NOT EXISTS "security_test_runs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schedule_id" uuid REFERENCES "test_schedules"("id"),
  "triggered_by" text,
  "status" "security_test_run_status" DEFAULT 'PENDING' NOT NULL,
  "target_url" text NOT NULL,
  "environment" text DEFAULT 'production' NOT NULL,
  "test_user_id" uuid REFERENCES "test_users"("id"),
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

-- Security test results
CREATE TABLE IF NOT EXISTS "security_test_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "run_id" uuid NOT NULL REFERENCES "security_test_runs"("id") ON DELETE CASCADE,
  "test_id" uuid NOT NULL REFERENCES "security_tests"("id"),
  "status" "security_test_status" DEFAULT 'PENDING' NOT NULL,
  "error_message" text,
  "stack_trace" text,
  "findings" jsonb,
  "screenshots" jsonb DEFAULT '[]',
  "console_errors" jsonb DEFAULT '[]',
  "network_errors" jsonb,
  "started_at" timestamp,
  "completed_at" timestamp,
  "duration_ms" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Security snapshots (periodic health checks)
CREATE TABLE IF NOT EXISTS "security_snapshots" (
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
  "last_test_run_id" uuid REFERENCES "security_test_runs"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS "security_test_runs_status_idx" ON "security_test_runs" ("status");
CREATE INDEX IF NOT EXISTS "security_test_runs_created_at_idx" ON "security_test_runs" ("created_at");
CREATE INDEX IF NOT EXISTS "security_test_runs_schedule_id_idx" ON "security_test_runs" ("schedule_id");
CREATE INDEX IF NOT EXISTS "security_test_results_run_id_idx" ON "security_test_results" ("run_id");
CREATE INDEX IF NOT EXISTS "security_test_results_test_id_idx" ON "security_test_results" ("test_id");
CREATE INDEX IF NOT EXISTS "security_test_results_status_idx" ON "security_test_results" ("status");
CREATE INDEX IF NOT EXISTS "security_snapshots_created_at_idx" ON "security_snapshots" ("created_at");
