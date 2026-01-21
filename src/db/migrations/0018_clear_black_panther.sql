CREATE TYPE "public"."brief_status" AS ENUM('DRAFT', 'READY', 'SUBMITTED', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "audiences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"demographics" jsonb,
	"firmographics" jsonb,
	"psychographics" jsonb,
	"behavioral" jsonb,
	"confidence" integer DEFAULT 50 NOT NULL,
	"sources" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid,
	"draft_id" uuid,
	"task_id" uuid,
	"status" "brief_status" DEFAULT 'DRAFT' NOT NULL,
	"completion_percentage" integer DEFAULT 0 NOT NULL,
	"topic" jsonb,
	"platform" jsonb,
	"content_type" jsonb,
	"intent" jsonb,
	"task_type" jsonb,
	"audience" jsonb,
	"dimensions" jsonb,
	"visual_direction" jsonb,
	"content_outline" jsonb,
	"brand_context" jsonb,
	"clarifying_questions_asked" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audiences" ADD CONSTRAINT "audiences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_draft_id_chat_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."chat_drafts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "briefs" ADD CONSTRAINT "briefs_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audiences_company_id_idx" ON "audiences" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "audiences_is_primary_idx" ON "audiences" USING btree ("company_id","is_primary");--> statement-breakpoint
CREATE INDEX "briefs_user_id_idx" ON "briefs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "briefs_company_id_idx" ON "briefs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "briefs_draft_id_idx" ON "briefs" USING btree ("draft_id");--> statement-breakpoint
CREATE INDEX "briefs_task_id_idx" ON "briefs" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "briefs_status_idx" ON "briefs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "briefs_created_at_idx" ON "briefs" USING btree ("created_at");