-- Drop constraints with Drizzle-generated names
ALTER TABLE "artist_skills" DROP CONSTRAINT IF EXISTS "artist_skills_verified_by_users_id_fk";
ALTER TABLE "assignment_algorithm_config" DROP CONSTRAINT IF EXISTS "assignment_algorithm_config_created_by_users_id_fk";
ALTER TABLE "assignment_algorithm_config" DROP CONSTRAINT IF EXISTS "assignment_algorithm_config_updated_by_users_id_fk";
ALTER TABLE "credit_transactions" DROP CONSTRAINT IF EXISTS "credit_transactions_related_task_id_tasks_id_fk";
ALTER TABLE "notification_settings" DROP CONSTRAINT IF EXISTS "notification_settings_updated_by_users_id_fk";
ALTER TABLE "notifications" DROP CONSTRAINT IF EXISTS "notifications_related_task_id_tasks_id_fk";
ALTER TABLE "task_activity_log" DROP CONSTRAINT IF EXISTS "task_activity_log_actor_id_users_id_fk";
ALTER TABLE "task_files" DROP CONSTRAINT IF EXISTS "task_files_uploaded_by_users_id_fk";
ALTER TABLE "task_messages" DROP CONSTRAINT IF EXISTS "task_messages_sender_id_users_id_fk";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_freelancer_id_users_id_fk";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_category_id_task_categories_id_fk";
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_offered_to_users_id_fk";

-- Drop constraints with alternate names (_fkey suffix)
ALTER TABLE "security_test_results" DROP CONSTRAINT IF EXISTS "security_test_results_test_id_fkey";
ALTER TABLE "security_test_runs" DROP CONSTRAINT IF EXISTS "security_test_runs_schedule_id_fkey";
ALTER TABLE "security_test_runs" DROP CONSTRAINT IF EXISTS "security_test_runs_test_user_id_fkey";
ALTER TABLE "test_schedules" DROP CONSTRAINT IF EXISTS "test_schedules_test_user_id_fkey";

-- Re-add constraints with correct onDelete policies
ALTER TABLE "artist_skills" ADD CONSTRAINT "artist_skills_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "assignment_algorithm_config" ADD CONSTRAINT "assignment_algorithm_config_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "assignment_algorithm_config" ADD CONSTRAINT "assignment_algorithm_config_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "credit_transactions" ADD CONSTRAINT "credit_transactions_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_related_task_id_tasks_id_fk" FOREIGN KEY ("related_task_id") REFERENCES "public"."tasks"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "security_test_results" ADD CONSTRAINT "security_test_results_test_id_security_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "public"."security_tests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "security_test_runs" ADD CONSTRAINT "security_test_runs_schedule_id_test_schedules_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."test_schedules"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "security_test_runs" ADD CONSTRAINT "security_test_runs_test_user_id_test_users_id_fk" FOREIGN KEY ("test_user_id") REFERENCES "public"."test_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "task_activity_log" ADD CONSTRAINT "task_activity_log_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "task_files" ADD CONSTRAINT "task_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "task_messages" ADD CONSTRAINT "task_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_freelancer_id_users_id_fk" FOREIGN KEY ("freelancer_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_offered_to_users_id_fk" FOREIGN KEY ("offered_to") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "test_schedules" ADD CONSTRAINT "test_schedules_test_user_id_test_users_id_fk" FOREIGN KEY ("test_user_id") REFERENCES "public"."test_users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
