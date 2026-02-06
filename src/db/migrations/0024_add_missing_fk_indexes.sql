ALTER TABLE "early_access_code_usages" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "early_access_codes" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "early_access_waitlist" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "early_access_code_usages" CASCADE;--> statement-breakpoint
DROP TABLE "early_access_codes" CASCADE;--> statement-breakpoint
DROP TABLE "early_access_waitlist" CASCADE;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "video_url" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "video_thumbnail_url" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "video_duration" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "video_tags" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "chat_drafts_client_id_idx" ON "chat_drafts" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "chat_drafts_updated_at_idx" ON "chat_drafts" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "credit_transactions_user_id_idx" ON "credit_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_related_task_id_idx" ON "credit_transactions" USING btree ("related_task_id");--> statement-breakpoint
CREATE INDEX "credit_transactions_created_at_idx" ON "credit_transactions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "notifications_user_id_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_related_task_id_idx" ON "notifications" USING btree ("related_task_id");--> statement-breakpoint
CREATE INDEX "notifications_created_at_idx" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "task_files_task_id_idx" ON "task_files" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_files_uploaded_by_idx" ON "task_files" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "task_messages_task_id_idx" ON "task_messages" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_messages_sender_id_idx" ON "task_messages" USING btree ("sender_id");--> statement-breakpoint
DROP TYPE "public"."waitlist_status";