-- Manual migration: Add Framer delivery columns to website_projects
-- Run via: psql $DATABASE_URL -f src/db/migrations/add-delivery-columns.sql

ALTER TABLE website_projects
  ADD COLUMN IF NOT EXISTS framer_project_url text,
  ADD COLUMN IF NOT EXISTS framer_preview_url text,
  ADD COLUMN IF NOT EXISTS framer_deployed_url text,
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'PENDING';

-- Website templates table for admin-managed Framer templates
CREATE TABLE IF NOT EXISTS website_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  industry text NOT NULL,
  style_tags jsonb DEFAULT '[]',
  framer_project_url text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_website_templates_industry ON website_templates(industry);
CREATE INDEX IF NOT EXISTS idx_website_templates_is_active ON website_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_website_projects_delivery_status ON website_projects(delivery_status);
