ALTER TABLE "companies" ADD COLUMN "slack_channel_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "slack_channel_name" text;--> statement-breakpoint
ALTER TABLE "deliverable_style_references" ADD COLUMN "example_output_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "slack_user_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "slack_dm_channel_id" text;