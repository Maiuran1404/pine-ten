-- Enable RLS on 9 remaining tables flagged by Supabase Security Advisor
-- All writes go through Drizzle ORM (service role, bypasses RLS).
-- These policies provide defense-in-depth against direct PostgREST/client access.

-- ============================================================
-- 1. Enable RLS on all 9 tables
-- ============================================================
ALTER TABLE "stripe_connect_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "briefs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_offers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_skill_requirements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "artist_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assignment_algorithm_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "client_artist_affinity" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Service role full access (explicit for clarity)
-- ============================================================
CREATE POLICY "service_role_stripe_connect_accounts" ON "stripe_connect_accounts"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_payouts" ON "payouts"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_briefs" ON "briefs"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_task_offers" ON "task_offers"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_task_skill_requirements" ON "task_skill_requirements"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_artist_skills" ON "artist_skills"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_skills" ON "skills"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_assignment_algorithm_config" ON "assignment_algorithm_config"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_client_artist_affinity" ON "client_artist_affinity"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Authenticated read policies (SELECT only)
-- ============================================================

-- stripe_connect_accounts: owner (freelancer_id) + admin
CREATE POLICY "users_read_own_stripe_connect_accounts" ON "stripe_connect_accounts"
  FOR SELECT TO authenticated
  USING (
    freelancer_id = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );

-- payouts: owner (freelancer_id) + admin
CREATE POLICY "users_read_own_payouts" ON "payouts"
  FOR SELECT TO authenticated
  USING (
    freelancer_id = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );

-- briefs: owner (user_id) + admin
CREATE POLICY "users_read_own_briefs" ON "briefs"
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );

-- task_offers: artist (artist_id) + admin
CREATE POLICY "users_read_own_task_offers" ON "task_offers"
  FOR SELECT TO authenticated
  USING (
    artist_id = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );

-- task_skill_requirements: all authenticated (non-sensitive junction table)
CREATE POLICY "authenticated_read_task_skill_requirements" ON "task_skill_requirements"
  FOR SELECT TO authenticated
  USING (true);

-- artist_skills: owner (artist_id) + admin
CREATE POLICY "users_read_own_artist_skills" ON "artist_skills"
  FOR SELECT TO authenticated
  USING (
    artist_id = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );

-- skills: all authenticated where active (catalog/lookup table)
CREATE POLICY "authenticated_read_skills" ON "skills"
  FOR SELECT TO authenticated
  USING (is_active = true);

-- assignment_algorithm_config: admin only
CREATE POLICY "admin_read_assignment_algorithm_config" ON "assignment_algorithm_config"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );

-- client_artist_affinity: either party (client_id OR artist_id) + admin
CREATE POLICY "users_read_own_client_artist_affinity" ON "client_artist_affinity"
  FOR SELECT TO authenticated
  USING (
    client_id = (select auth.uid())::text
    OR artist_id = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );
