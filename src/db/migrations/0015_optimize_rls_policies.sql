-- Optimize RLS policies to avoid per-row evaluation of auth functions
-- This migration fixes the performance warning from Supabase Performance Advisor
-- by wrapping auth.uid() in a subquery (select auth.uid()) to cache the value

-- Drop and recreate the generated_designs policy with optimized auth check
DROP POLICY IF EXISTS "users_read_own_generated_designs" ON "generated_designs";
CREATE POLICY "users_read_own_generated_designs" ON "generated_designs"
  FOR SELECT
  TO authenticated
  USING (client_id = (select auth.uid())::text);

-- Drop and recreate the style_selection_history policy with optimized auth check
DROP POLICY IF EXISTS "users_read_own_style_selection_history" ON "style_selection_history";
CREATE POLICY "users_read_own_style_selection_history" ON "style_selection_history"
  FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid())::text);
