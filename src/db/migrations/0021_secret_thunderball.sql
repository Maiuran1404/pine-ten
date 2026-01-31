CREATE TYPE "public"."artist_experience_level" AS ENUM('JUNIOR', 'MID', 'SENIOR', 'EXPERT');--> statement-breakpoint
CREATE TYPE "public"."decline_reason" AS ENUM('TOO_BUSY', 'SKILL_MISMATCH', 'DEADLINE_TOO_TIGHT', 'LOW_CREDITS', 'PERSONAL_CONFLICT', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."skill_proficiency" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');--> statement-breakpoint
CREATE TYPE "public"."task_complexity" AS ENUM('SIMPLE', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');--> statement-breakpoint
CREATE TYPE "public"."task_offer_response" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."task_urgency" AS ENUM('CRITICAL', 'URGENT', 'STANDARD', 'FLEXIBLE');--> statement-breakpoint
ALTER TYPE "public"."task_status" ADD VALUE 'OFFERED' BEFORE 'ASSIGNED';--> statement-breakpoint
ALTER TYPE "public"."task_status" ADD VALUE 'UNASSIGNABLE';--> statement-breakpoint
CREATE TABLE "artist_skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"artist_id" text NOT NULL,
	"skill_id" uuid NOT NULL,
	"proficiency_level" "skill_proficiency" DEFAULT 'INTERMEDIATE' NOT NULL,
	"years_experience" numeric(3, 1),
	"verified" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp,
	"verified_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assignment_algorithm_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"weights" jsonb DEFAULT '{"skillMatch":35,"timezoneFit":20,"experienceMatch":20,"workloadBalance":15,"performanceHistory":10}'::jsonb NOT NULL,
	"acceptance_windows" jsonb DEFAULT '{"critical":10,"urgent":30,"standard":120,"flexible":240}'::jsonb NOT NULL,
	"escalation_settings" jsonb DEFAULT '{"level1SkillThreshold":70,"level2SkillThreshold":50,"level1MaxOffers":3,"level2MaxOffers":3,"level3BroadcastMinutes":30,"maxWorkloadOverride":1}'::jsonb NOT NULL,
	"timezone_settings" jsonb DEFAULT '{"peakHoursStart":"09:00","peakHoursEnd":"18:00","peakScore":100,"eveningScore":80,"earlyMorningScore":70,"lateEveningScore":50,"nightScore":20}'::jsonb NOT NULL,
	"experience_matrix" jsonb DEFAULT '{"SIMPLE":{"JUNIOR":100,"MID":90,"SENIOR":70,"EXPERT":50},"INTERMEDIATE":{"JUNIOR":60,"MID":100,"SENIOR":90,"EXPERT":80},"ADVANCED":{"JUNIOR":20,"MID":70,"SENIOR":100,"EXPERT":95},"EXPERT":{"JUNIOR":0,"MID":40,"SENIOR":80,"EXPERT":100}}'::jsonb NOT NULL,
	"workload_settings" jsonb DEFAULT '{"maxActiveTasks":5,"scorePerTask":20}'::jsonb NOT NULL,
	"exclusion_rules" jsonb DEFAULT '{"minSkillScoreToInclude":50,"excludeOverloaded":true,"excludeNightHoursForUrgent":true,"excludeVacationMode":true}'::jsonb NOT NULL,
	"bonus_modifiers" jsonb DEFAULT '{"categorySpecializationBonus":10,"niceToHaveSkillBonus":5,"favoriteArtistBonus":10}'::jsonb NOT NULL,
	"created_by" text,
	"updated_by" text,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_artist_affinity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" text NOT NULL,
	"artist_id" text NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"tasks_completed" integer DEFAULT 0 NOT NULL,
	"avg_rating" numeric(3, 2),
	"last_worked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "skills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "skills_name_unique" UNIQUE("name"),
	CONSTRAINT "skills_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "task_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"artist_id" text NOT NULL,
	"match_score" numeric(5, 2),
	"escalation_level" integer DEFAULT 1 NOT NULL,
	"offered_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"responded_at" timestamp,
	"response" "task_offer_response" DEFAULT 'PENDING' NOT NULL,
	"decline_reason" "decline_reason",
	"decline_note" text,
	"score_breakdown" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_skill_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"skill_id" uuid NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"min_proficiency" "skill_proficiency" DEFAULT 'INTERMEDIATE',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "experience_level" "artist_experience_level" DEFAULT 'JUNIOR';--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "max_concurrent_tasks" integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "accepts_urgent_tasks" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "working_hours_start" text DEFAULT '09:00';--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "working_hours_end" text DEFAULT '18:00';--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "avg_response_time_minutes" integer;--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "acceptance_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "on_time_rate" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "preferred_categories" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "min_credits_to_accept" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "vacation_mode" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "freelancer_profiles" ADD COLUMN "vacation_until" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "complexity" "task_complexity" DEFAULT 'INTERMEDIATE';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "urgency" "task_urgency" DEFAULT 'STANDARD';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "offered_to" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "offer_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "escalation_level" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "required_skills" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "artist_skills" ADD CONSTRAINT "artist_skills_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_skills" ADD CONSTRAINT "artist_skills_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "artist_skills" ADD CONSTRAINT "artist_skills_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_algorithm_config" ADD CONSTRAINT "assignment_algorithm_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assignment_algorithm_config" ADD CONSTRAINT "assignment_algorithm_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_artist_affinity" ADD CONSTRAINT "client_artist_affinity_client_id_users_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_artist_affinity" ADD CONSTRAINT "client_artist_affinity_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_offers" ADD CONSTRAINT "task_offers_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_offers" ADD CONSTRAINT "task_offers_artist_id_users_id_fk" FOREIGN KEY ("artist_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_skill_requirements" ADD CONSTRAINT "task_skill_requirements_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_skill_requirements" ADD CONSTRAINT "task_skill_requirements_skill_id_skills_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skills"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "artist_skills_artist_id_idx" ON "artist_skills" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "artist_skills_skill_id_idx" ON "artist_skills" USING btree ("skill_id");--> statement-breakpoint
CREATE INDEX "client_artist_affinity_client_id_idx" ON "client_artist_affinity" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "client_artist_affinity_artist_id_idx" ON "client_artist_affinity" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "task_offers_task_id_idx" ON "task_offers" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_offers_artist_id_idx" ON "task_offers" USING btree ("artist_id");--> statement-breakpoint
CREATE INDEX "task_offers_response_idx" ON "task_offers" USING btree ("response");--> statement-breakpoint
CREATE INDEX "task_offers_expires_at_idx" ON "task_offers" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "task_skill_requirements_task_id_idx" ON "task_skill_requirements" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "task_skill_requirements_skill_id_idx" ON "task_skill_requirements" USING btree ("skill_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_offered_to_users_id_fk" FOREIGN KEY ("offered_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_offered_to_idx" ON "tasks" USING btree ("offered_to");--> statement-breakpoint
CREATE INDEX "tasks_offer_expires_at_idx" ON "tasks" USING btree ("offer_expires_at");