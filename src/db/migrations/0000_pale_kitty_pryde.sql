CREATE TYPE "public"."freelancer_status" AS ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('EMAIL', 'WHATSAPP', 'IN_APP');--> statement-breakpoint
CREATE TYPE "public"."task_category" AS ENUM('STATIC_ADS', 'VIDEO_MOTION', 'SOCIAL_MEDIA');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('PENDING', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'REVISION_REQUESTED', 'COMPLETED', 'CANCELLED');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('CLIENT', 'FREELANCER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"description" text,
	"related_task_id" uuid,
	"stripe_payment_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "freelancer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"status" "freelancer_status" DEFAULT 'PENDING' NOT NULL,
	"skills" jsonb DEFAULT '[]'::jsonb,
	"specializations" jsonb DEFAULT '[]'::jsonb,
	"portfolio_urls" jsonb DEFAULT '[]'::jsonb,
	"bio" text,
	"hourly_rate" numeric(10, 2),
	"rating" numeric(3, 2) DEFAULT '0',
	"completed_tasks" integer DEFAULT 0 NOT NULL,
	"whatsapp_number" text,
	"availability" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "freelancer_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"related_task_id" uuid,
	"sent_at" timestamp,
	"read_at" timestamp,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "style_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"image_url" text NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"base_credits" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "task_categories_name_unique" UNIQUE("name"),
	CONSTRAINT "task_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "task_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"uploaded_by" text NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"is_deliverable" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"sender_id" text NOT NULL,
	"content" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"freelancer_id" text,
	"category_id" uuid,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"status" "task_status" DEFAULT 'PENDING' NOT NULL,
	"requirements" jsonb,
	"style_references" jsonb DEFAULT '[]'::jsonb,
	"chat_history" jsonb DEFAULT '[]'::jsonb,
	"estimated_hours" numeric(5, 2),
	"credits_used" integer DEFAULT 1 NOT NULL,
	"max_revisions" integer DEFAULT 2 NOT NULL,
	"revisions_used" integer DEFAULT 0 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"deadline" timestamp,
	"assigned_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'CLIENT' NOT NULL,
	"phone" text,
	"credits" integer DEFAULT 0 NOT NULL,
	"onboarding_completed" boolean DEFAULT false NOT NULL,
	"onboarding_data" jsonb,
	"notification_preferences" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD CONSTRAINT "freelancer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_freelancer_id_users_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE no action ON UPDATE no action;