CREATE TYPE "public"."content_batch_status" AS ENUM('PENDING', 'GENERATING', 'REVIEW', 'APPROVED', 'SCHEDULED', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."content_item_status" AS ENUM('DRAFT', 'GENERATED', 'REVIEWING', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."content_platform" AS ENUM('INSTAGRAM', 'LINKEDIN', 'FACEBOOK', 'X', 'YOUTUBE', 'TIKTOK', 'EMAIL');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('SOCIAL_POST', 'STORY', 'REEL', 'CAROUSEL', 'VIDEO', 'EMAIL', 'BLOG');--> statement-breakpoint
CREATE TYPE "public"."kanban_category" AS ENUM('DIY', 'UPSELL', 'STRATEGIC');--> statement-breakpoint
CREATE TYPE "public"."kanban_task_status" AS ENUM('SUGGESTED', 'IN_PROGRESS', 'DONE', 'DISMISSED');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'PAST_DUE', 'CANCELLED', 'TRIALING', 'PAUSED');--> statement-breakpoint
CREATE TYPE "public"."upsell_order_status" AS ENUM('PENDING', 'PAID', 'IN_PROGRESS', 'DELIVERED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."upsell_product_type" AS ENUM('WEBSITE_BASIC', 'WEBSITE_PRO', 'VIDEO_NARRATIVE', 'VIDEO_ANIMATED');--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'CONTENT_APPROVE';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'CONTENT_REJECT';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'CONTENT_EDIT';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'BATCH_APPROVE';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'BATCH_REJECT';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'UPSELL_ASSIGN';--> statement-breakpoint
ALTER TYPE "public"."audit_action_type" ADD VALUE 'UPSELL_COMPLETE';--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"social_handles" jsonb,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"created_by" text,
	"week_start" timestamp NOT NULL,
	"status" "content_batch_status" DEFAULT 'PENDING' NOT NULL,
	"approved_at" timestamp,
	"approved_by" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"batch_id" uuid,
	"template_id" uuid,
	"content_type" "content_type" NOT NULL,
	"platform" "content_platform" NOT NULL,
	"status" "content_item_status" DEFAULT 'DRAFT' NOT NULL,
	"title" text,
	"body" text,
	"media_urls" jsonb,
	"metadata" jsonb,
	"scheduled_at" timestamp,
	"published_at" timestamp,
	"ai_prompt" text,
	"ai_model_id" text,
	"created_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"content_type" "content_type" NOT NULL,
	"platform" "content_platform" NOT NULL,
	"template_body" text NOT NULL,
	"thumbnail_url" text,
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"category" "kanban_category" NOT NULL,
	"status" "kanban_task_status" DEFAULT 'SUGGESTED' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"upsell_order_id" uuid,
	"due_date" timestamp,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_price_id" text NOT NULL,
	"status" "subscription_status" DEFAULT 'ACTIVE' NOT NULL,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"cancelled_at" timestamp,
	"trial_start" timestamp,
	"trial_end" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
CREATE TABLE "upsell_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"ordered_by" text NOT NULL,
	"product_type" "upsell_product_type" NOT NULL,
	"status" "upsell_order_status" DEFAULT 'PENDING' NOT NULL,
	"price_in_cents" integer NOT NULL,
	"stripe_payment_intent_id" text,
	"assigned_to" text,
	"deliverable_url" text,
	"brief_data" jsonb,
	"paid_at" timestamp,
	"delivered_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_batches" ADD CONSTRAINT "content_batches_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_batches" ADD CONSTRAINT "content_batches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_batches" ADD CONSTRAINT "content_batches_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_batch_id_content_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."content_batches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_template_id_content_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."content_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_items" ADD CONSTRAINT "content_items_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_upsell_order_id_upsell_orders_id_fk" FOREIGN KEY ("upsell_order_id") REFERENCES "public"."upsell_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_orders" ADD CONSTRAINT "upsell_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_orders" ADD CONSTRAINT "upsell_orders_ordered_by_users_id_fk" FOREIGN KEY ("ordered_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upsell_orders" ADD CONSTRAINT "upsell_orders_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comp_company_id_idx" ON "competitors" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "cb_company_id_idx" ON "content_batches" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "cb_week_start_idx" ON "content_batches" USING btree ("week_start");--> statement-breakpoint
CREATE INDEX "cb_status_idx" ON "content_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ci_company_id_idx" ON "content_items" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "ci_batch_id_idx" ON "content_items" USING btree ("batch_id");--> statement-breakpoint
CREATE INDEX "ci_status_idx" ON "content_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ci_platform_idx" ON "content_items" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "ci_scheduled_at_idx" ON "content_items" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "ct_content_type_idx" ON "content_templates" USING btree ("content_type");--> statement-breakpoint
CREATE INDEX "ct_platform_idx" ON "content_templates" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "kt_company_id_idx" ON "kanban_tasks" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "kt_category_idx" ON "kanban_tasks" USING btree ("category");--> statement-breakpoint
CREATE INDEX "kt_status_idx" ON "kanban_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "sub_user_id_idx" ON "subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sub_stripe_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "sub_status_idx" ON "subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uo_company_id_idx" ON "upsell_orders" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "uo_ordered_by_idx" ON "upsell_orders" USING btree ("ordered_by");--> statement-breakpoint
CREATE INDEX "uo_status_idx" ON "upsell_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "uo_product_type_idx" ON "upsell_orders" USING btree ("product_type");