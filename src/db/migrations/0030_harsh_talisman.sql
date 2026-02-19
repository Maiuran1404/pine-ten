ALTER TABLE "chat_test_runs" ADD COLUMN "composite_score" integer;--> statement-breakpoint
ALTER TABLE "chat_test_runs" ADD COLUMN "scores" jsonb;--> statement-breakpoint
ALTER TABLE "chat_test_runs" ADD COLUMN "scored_at" timestamp;--> statement-breakpoint
CREATE INDEX "chat_test_runs_composite_score_idx" ON "chat_test_runs" USING btree ("composite_score");