-- Enable RLS on 4 tables flagged by Supabase Security Advisor:
--   artist_invites, website_inspirations, website_projects, template_images
-- All writes go through Drizzle ORM (service role, bypasses RLS).
-- These policies provide defense-in-depth against direct PostgREST/client access.

-- ============================================================
-- 1. Enable RLS
-- ============================================================
ALTER TABLE "artist_invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "website_inspirations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "website_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "template_images" ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Service role full access
-- ============================================================
CREATE POLICY "service_role_artist_invites" ON "artist_invites"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_website_inspirations" ON "website_inspirations"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_website_projects" ON "website_projects"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_role_template_images" ON "template_images"
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Authenticated read policies
-- ============================================================

-- artist_invites: admin only (contains invite tokens and emails)
CREATE POLICY "admin_read_artist_invites" ON "artist_invites"
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );

-- website_inspirations: all authenticated (public gallery content)
CREATE POLICY "authenticated_read_website_inspirations" ON "website_inspirations"
  FOR SELECT TO authenticated
  USING (is_active = true);

-- website_projects: owner (user_id) + admin
CREATE POLICY "users_read_own_website_projects" ON "website_projects"
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM "users"
      WHERE id = (select auth.uid())::text AND role = 'ADMIN'
    )
  );

-- template_images: all authenticated (public catalog)
CREATE POLICY "authenticated_read_template_images" ON "template_images"
  FOR SELECT TO authenticated
  USING (true);
