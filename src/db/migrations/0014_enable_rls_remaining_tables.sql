-- Enable Row Level Security on remaining tables
-- This migration enables RLS for all tables that were missing RLS policies
-- The service role connection (used by Drizzle ORM) bypasses RLS automatically

-- Enable RLS on all remaining tables
ALTER TABLE "generated_designs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "orshot_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_schedules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_test_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "deliverable_style_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_test_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_tests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "brand_references" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "security_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "style_selection_history" ENABLE ROW LEVEL SECURITY;

-- Create policies for service role access
-- Note: service_role bypasses RLS by default, but we add explicit policies for clarity

-- Generated designs: service role full access
CREATE POLICY "service_role_generated_designs" ON "generated_designs"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Webhook events: service role full access (system table, no user access needed)
CREATE POLICY "service_role_webhook_events" ON "webhook_events"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Orshot templates: service role full access
CREATE POLICY "service_role_orshot_templates" ON "orshot_templates"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Test users: service role full access (admin/testing only)
CREATE POLICY "service_role_test_users" ON "test_users"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Test schedules: service role full access (admin/testing only)
CREATE POLICY "service_role_test_schedules" ON "test_schedules"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Notification settings: service role full access (admin only)
CREATE POLICY "service_role_notification_settings" ON "notification_settings"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Security test runs: service role full access (admin/testing only)
CREATE POLICY "service_role_security_test_runs" ON "security_test_runs"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deliverable style references: service role full access
CREATE POLICY "service_role_deliverable_style_references" ON "deliverable_style_references"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Security test results: service role full access (admin/testing only)
CREATE POLICY "service_role_security_test_results" ON "security_test_results"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Security tests: service role full access (admin/testing only)
CREATE POLICY "service_role_security_tests" ON "security_tests"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Brand references: service role full access
CREATE POLICY "service_role_brand_references" ON "brand_references"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Security snapshots: service role full access (admin/testing only)
CREATE POLICY "service_role_security_snapshots" ON "security_snapshots"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Style selection history: service role full access
CREATE POLICY "service_role_style_selection_history" ON "style_selection_history"
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Public read access for reference tables (templates, brand references, style references)
-- These are catalog tables that should be readable by authenticated users

CREATE POLICY "authenticated_read_orshot_templates" ON "orshot_templates"
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "authenticated_read_brand_references" ON "brand_references"
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "authenticated_read_deliverable_style_references" ON "deliverable_style_references"
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Users can read their own generated designs
CREATE POLICY "users_read_own_generated_designs" ON "generated_designs"
  FOR SELECT
  TO authenticated
  USING (client_id = auth.uid()::text);

-- Users can read their own style selection history
CREATE POLICY "users_read_own_style_selection_history" ON "style_selection_history"
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid()::text);
