ALTER TABLE "deliverable_style_references" ADD COLUMN "color_temperature" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "energy_level" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "density_level" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "formality_level" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "color_samples" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "industries" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "target_audience" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "visual_elements" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "mood_keywords" jsonb DEFAULT '[]'::jsonb;