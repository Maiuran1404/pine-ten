CREATE TABLE "style_selection_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"style_id" uuid NOT NULL,
	"deliverable_type" text NOT NULL,
	"style_axis" text NOT NULL,
	"selection_context" text DEFAULT 'chat' NOT NULL,
	"was_confirmed" boolean DEFAULT false NOT NULL,
	"draft_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "style_selection_history" ADD CONSTRAINT "style_selection_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_selection_history" ADD CONSTRAINT "style_selection_history_style_id_deliverable_style_references_id_fk" FOREIGN KEY ("style_id") REFERENCES "public"."deliverable_style_references"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "style_selection_history" ADD CONSTRAINT "style_selection_history_draft_id_chat_drafts_id_fk" FOREIGN KEY ("draft_id") REFERENCES "public"."chat_drafts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ssh_user_id_idx" ON "style_selection_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "ssh_user_style_idx" ON "style_selection_history" USING btree ("user_id","style_axis");--> statement-breakpoint
CREATE INDEX "ssh_user_type_idx" ON "style_selection_history" USING btree ("user_id","deliverable_type");