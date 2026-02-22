CREATE TYPE "public"."artist_invite_status" AS ENUM('PENDING', 'ACCEPTED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "artist_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token" text NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"whatsapp_number" text,
	"note" text,
	"status" "artist_invite_status" DEFAULT 'PENDING' NOT NULL,
	"invited_by" text,
	"accepted_by" text,
	"accepted_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "artist_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "artist_invites" ADD CONSTRAINT "artist_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_invites" ADD CONSTRAINT "artist_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_invites_token_idx" ON "artist_invites" USING btree ("token");--> statement-breakpoint
CREATE INDEX "artist_invites_email_idx" ON "artist_invites" USING btree ("email");--> statement-breakpoint
CREATE INDEX "artist_invites_status_idx" ON "artist_invites" USING btree ("status");