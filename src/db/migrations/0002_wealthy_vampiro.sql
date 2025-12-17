CREATE TABLE "chat_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"title" text DEFAULT 'New Request' NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"selected_styles" jsonb DEFAULT '[]'::jsonb,
	"pending_task" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_drafts" ADD CONSTRAINT "chat_drafts_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;