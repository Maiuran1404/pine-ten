-- Add audiences table for storing inferred/user-defined target audiences
CREATE TABLE IF NOT EXISTS "audiences" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "is_primary" boolean NOT NULL DEFAULT false,
  "demographics" jsonb,
  "firmographics" jsonb,
  "psychographics" jsonb,
  "behavioral" jsonb,
  "confidence" integer NOT NULL DEFAULT 50,
  "sources" jsonb DEFAULT '[]'::jsonb,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS "audiences_company_id_idx" ON "audiences" ("company_id");
CREATE INDEX IF NOT EXISTS "audiences_is_primary_idx" ON "audiences" ("company_id", "is_primary");

-- Enable RLS for the audiences table
ALTER TABLE "audiences" ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see audiences for companies they belong to
CREATE POLICY "audiences_select_policy" ON "audiences"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "users"
      WHERE "users"."company_id" = "audiences"."company_id"
      AND "users"."id" = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM "users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'ADMIN'
    )
  );

-- RLS Policy: Users can insert audiences for their own company
CREATE POLICY "audiences_insert_policy" ON "audiences"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "users"
      WHERE "users"."company_id" = "audiences"."company_id"
      AND "users"."id" = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM "users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'ADMIN'
    )
  );

-- RLS Policy: Users can update audiences for their own company
CREATE POLICY "audiences_update_policy" ON "audiences"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "users"
      WHERE "users"."company_id" = "audiences"."company_id"
      AND "users"."id" = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM "users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'ADMIN'
    )
  );

-- RLS Policy: Users can delete audiences for their own company
CREATE POLICY "audiences_delete_policy" ON "audiences"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "users"
      WHERE "users"."company_id" = "audiences"."company_id"
      AND "users"."id" = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM "users"
      WHERE "users"."id" = auth.uid()
      AND "users"."role" = 'ADMIN'
    )
  );
