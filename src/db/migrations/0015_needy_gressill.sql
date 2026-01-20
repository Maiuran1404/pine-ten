CREATE TYPE "public"."import_log_source" AS ENUM('bigged', 'dribbble', 'manual_url', 'file_upload', 'page_scrape');--> statement-breakpoint
CREATE TYPE "public"."import_log_target" AS ENUM('deliverable_style', 'brand_reference');--> statement-breakpoint
CREATE TABLE "import_logs" (
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
--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "image_hash" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "source_url" text;--> statement-breakpoint
ALTER TABLE "import_logs" ADD CONSTRAINT "import_logs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "import_logs_source_idx" ON "import_logs" USING btree ("source");--> statement-breakpoint
CREATE INDEX "import_logs_target_idx" ON "import_logs" USING btree ("target");--> statement-breakpoint
CREATE INDEX "import_logs_triggered_by_idx" ON "import_logs" USING btree ("triggered_by");--> statement-breakpoint
CREATE INDEX "import_logs_created_at_idx" ON "import_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "import_logs_source_target_idx" ON "import_logs" USING btree ("source","target");