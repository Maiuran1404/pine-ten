CREATE TYPE "public"."audit_action_type" AS ENUM('AUTH_LOGIN', 'AUTH_LOGOUT', 'AUTH_FAILED_LOGIN', 'AUTH_PASSWORD_CHANGE', 'AUTH_2FA_ENABLED', 'AUTH_2FA_DISABLED', 'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_ROLE_CHANGE', 'FREELANCER_APPROVE', 'FREELANCER_REJECT', 'FREELANCER_SUSPEND', 'FREELANCER_BULK_ACTION', 'TASK_CREATE', 'TASK_ASSIGN', 'TASK_STATUS_CHANGE', 'TASK_DELETE', 'CREDIT_PURCHASE', 'CREDIT_USAGE', 'CREDIT_REFUND', 'CREDIT_MANUAL_ADJUST', 'SETTINGS_UPDATE', 'COUPON_CREATE', 'COUPON_DELETE', 'ADMIN_DATABASE_ACCESS', 'ADMIN_EXPORT_DATA', 'ADMIN_IMPERSONATE', 'SECURITY_TEST_RUN', 'SECURITY_ALERT');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" text,
	"actor_email" text,
	"actor_role" text,
	"action" "audit_action_type" NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"details" jsonb,
	"previous_value" jsonb,
	"new_value" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"error_message" text,
	"ip_address" text,
	"user_agent" text,
	"endpoint" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_type_idx" ON "audit_logs" USING btree ("resource_type");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_id_idx" ON "audit_logs" USING btree ("resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "audit_logs_actor_action_idx" ON "audit_logs" USING btree ("actor_id","action");