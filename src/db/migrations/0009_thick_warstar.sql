CREATE TABLE "brand_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"tone_bucket" text NOT NULL,
	"energy_bucket" text NOT NULL,
	"color_bucket" text NOT NULL,
	"color_samples" jsonb DEFAULT '[]'::jsonb,
	"visual_styles" jsonb DEFAULT '[]'::jsonb,
	"industries" jsonb DEFAULT '[]'::jsonb,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliverable_style_references" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"image_url" text NOT NULL,
	"deliverable_type" text NOT NULL,
	"style_axis" text NOT NULL,
	"sub_style" text,
	"semantic_tags" jsonb DEFAULT '[]'::jsonb,
	"featured_order" integer DEFAULT 0 NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "dsr_type_style_idx" ON "deliverable_style_references" USING btree ("deliverable_type","style_axis");--> statement-breakpoint
CREATE INDEX "dsr_type_active_idx" ON "deliverable_style_references" USING btree ("deliverable_type","is_active");