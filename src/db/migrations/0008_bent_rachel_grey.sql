CREATE TABLE "generated_designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"template_id" uuid,
	"template_name" text NOT NULL,
	"image_url" text NOT NULL,
	"image_format" text NOT NULL,
	"modifications_used" jsonb,
	"saved_to_assets" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orshot_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text NOT NULL,
	"orshot_template_id" integer NOT NULL,
	"preview_image_url" text,
	"parameter_mapping" jsonb NOT NULL,
	"output_format" text DEFAULT 'png' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generated_designs" ADD CONSTRAINT "generated_designs_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_designs" ADD CONSTRAINT "generated_designs_template_id_orshot_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."orshot_templates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generated_designs_client_id_idx" ON "generated_designs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "generated_designs_created_at_idx" ON "generated_designs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "orshot_templates_category_idx" ON "orshot_templates" USING btree ("category");