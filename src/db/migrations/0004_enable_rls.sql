-- Enable Row Level Security on all tables
-- This migration enables RLS to secure tables against direct PostgREST access
-- The service role connection (used by Drizzle ORM) bypasses RLS automatically

-- Auth-related tables (managed by BetterAuth)
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verifications" ENABLE ROW LEVEL SECURITY;

-- Business tables
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "freelancer_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat_drafts" ENABLE ROW LEVEL SECURITY;

-- Reference and settings tables
ALTER TABLE "style_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform_settings" ENABLE ROW LEVEL SECURITY;

-- Transaction and notification tables
ALTER TABLE "credit_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access (allows backend to operate normally)
-- Note: service_role bypasses RLS by default, but we add explicit policies for clarity

-- Users: service role full access
CREATE POLICY "service_role_users" ON "users"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Sessions: service role full access
CREATE POLICY "service_role_sessions" ON "sessions"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Accounts: service role full access
CREATE POLICY "service_role_accounts" ON "accounts"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verifications: service role full access
CREATE POLICY "service_role_verifications" ON "verifications"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Companies: service role full access
CREATE POLICY "service_role_companies" ON "companies"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Freelancer profiles: service role full access
CREATE POLICY "service_role_freelancer_profiles" ON "freelancer_profiles"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Tasks: service role full access
CREATE POLICY "service_role_tasks" ON "tasks"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Task files: service role full access
CREATE POLICY "service_role_task_files" ON "task_files"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Task messages: service role full access
CREATE POLICY "service_role_task_messages" ON "task_messages"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Task categories: service role full access
CREATE POLICY "service_role_task_categories" ON "task_categories"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Chat drafts: service role full access
CREATE POLICY "service_role_chat_drafts" ON "chat_drafts"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Style references: service role full access
CREATE POLICY "service_role_style_references" ON "style_references"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Platform settings: service role full access
CREATE POLICY "service_role_platform_settings" ON "platform_settings"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Credit transactions: service role full access
CREATE POLICY "service_role_credit_transactions" ON "credit_transactions"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Notifications: service role full access
CREATE POLICY "service_role_notifications" ON "notifications"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
