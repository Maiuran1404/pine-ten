CREATE TABLE "notification_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"whatsapp_enabled" boolean DEFAULT true NOT NULL,
	"in_app_enabled" boolean DEFAULT true NOT NULL,
	"notify_client" boolean DEFAULT false NOT NULL,
	"notify_freelancer" boolean DEFAULT false NOT NULL,
	"notify_admin" boolean DEFAULT false NOT NULL,
	"email_subject" text,
	"email_template" text,
	"whatsapp_template" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text,
	CONSTRAINT "notification_settings_event_type_unique" UNIQUE("event_type")
);
--> statement-breakpoint
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;