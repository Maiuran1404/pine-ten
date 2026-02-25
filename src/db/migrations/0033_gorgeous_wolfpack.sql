CREATE TYPE "public"."website_delivery_status" AS ENUM('PENDING', 'PUSHING', 'PUSHED', 'PREVIEWING', 'PREVIEW_READY', 'DEPLOYING', 'DEPLOYED', 'FAILED');--> statement-breakpoint
CREATE TABLE "template_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_key" text NOT NULL,
	"option_key" text,
	"image_url" text NOT NULL,
	"source_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN "delivery_status" "website_delivery_status" DEFAULT 'PENDING' NOT NULL;--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN "framer_project_url" text;--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN "framer_preview_url" text;--> statement-breakpoint
ALTER TABLE "website_projects" ADD COLUMN "framer_deployed_url" text;--> statement-breakpoint
CREATE INDEX "ti_category_idx" ON "template_images" USING btree ("category_key");--> statement-breakpoint
CREATE UNIQUE INDEX "ti_category_option_idx" ON "template_images" USING btree ("category_key","option_key");