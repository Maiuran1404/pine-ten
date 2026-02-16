CREATE TABLE "chat_test_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"triggered_by" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"scenario_name" text NOT NULL,
	"scenario_config" jsonb NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"briefing_state" jsonb,
	"final_stage" text,
	"total_turns" integer DEFAULT 0 NOT NULL,
	"reached_review" boolean DEFAULT false NOT NULL,
	"error_message" text,
	"duration_ms" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_drafts" ADD COLUMN "briefing_state" jsonb;--> statement-breakpoint
ALTER TABLE "chat_test_runs" ADD CONSTRAINT "chat_test_runs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_test_runs_batch_id_idx" ON "chat_test_runs" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "chat_test_runs_created_at_idx" ON "chat_test_runs" USING btree ("created_at");