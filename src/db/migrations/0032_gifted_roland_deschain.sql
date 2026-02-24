CREATE TYPE "public"."website_flow_phase" AS ENUM('INSPIRATION', 'SKELETON', 'APPROVAL');--> statement-breakpoint
CREATE TYPE "public"."website_project_status" AS ENUM('DRAFT', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TABLE "website_inspirations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"screenshot_url" text NOT NULL,
	"thumbnail_url" text,
	"industry" jsonb DEFAULT '[]'::jsonb,
	"style_tags" jsonb DEFAULT '[]'::jsonb,
	"color_samples" jsonb DEFAULT '[]'::jsonb,
	"section_types" jsonb DEFAULT '[]'::jsonb,
	"typography" text,
	"layout_style" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "website_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"company_id" uuid,
	"task_id" uuid,
	"phase" "website_flow_phase" DEFAULT 'INSPIRATION' NOT NULL,
	"status" "website_project_status" DEFAULT 'DRAFT' NOT NULL,
	"selected_inspirations" jsonb DEFAULT '[]'::jsonb,
	"user_notes" text,
	"skeleton" jsonb,
	"chat_history" jsonb DEFAULT '[]'::jsonb,
	"skeleton_stage" text DEFAULT 'INITIAL_GENERATION',
	"timeline" jsonb,
	"credits_used" integer DEFAULT 0 NOT NULL,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "website_projects" ADD CONSTRAINT "website_projects_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "website_inspirations_industry_idx" ON "website_inspirations" USING btree ("industry");--> statement-breakpoint
CREATE INDEX "website_inspirations_is_active_idx" ON "website_inspirations" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "website_inspirations_display_order_idx" ON "website_inspirations" USING btree ("display_order");--> statement-breakpoint
CREATE INDEX "website_projects_user_id_idx" ON "website_projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "website_projects_status_idx" ON "website_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "website_projects_phase_idx" ON "website_projects" USING btree ("phase");--> statement-breakpoint
CREATE INDEX "website_projects_task_id_idx" ON "website_projects" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "website_projects_created_at_idx" ON "website_projects" USING btree ("created_at");