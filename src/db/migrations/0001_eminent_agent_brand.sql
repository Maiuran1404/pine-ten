CREATE TYPE "public"."onboarding_status" AS ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"website" text,
	"industry" text,
	"description" text,
	"logo_url" text,
	"favicon_url" text,
	"primary_color" text,
	"secondary_color" text,
	"accent_color" text,
	"background_color" text,
	"text_color" text,
	"brand_colors" jsonb DEFAULT '[]'::jsonb,
	"primary_font" text,
	"secondary_font" text,
	"social_links" jsonb,
	"contact_email" text,
	"contact_phone" text,
	"brand_assets" jsonb,
	"tagline" text,
	"keywords" jsonb DEFAULT '[]'::jsonb,
	"onboarding_status" "onboarding_status" DEFAULT 'NOT_STARTED' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" uuid;