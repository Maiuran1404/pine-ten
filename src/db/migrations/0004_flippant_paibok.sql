CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"event_type" text NOT NULL,
	"provider" text DEFAULT 'stripe' NOT NULL,
	"payload" jsonb,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"status" text DEFAULT 'processed' NOT NULL,
	"error_message" text,
	CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE INDEX "webhook_events_event_id_idx" ON "webhook_events" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "webhook_events_processed_at_idx" ON "webhook_events" USING btree ("processed_at");