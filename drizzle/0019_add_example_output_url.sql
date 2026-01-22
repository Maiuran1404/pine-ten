-- Add example_output_url column to deliverable_style_references table
-- This allows styles to link to example outputs showing how designs look when created with this style

ALTER TABLE "deliverable_style_references" ADD COLUMN IF NOT EXISTS "example_output_url" text;

-- Add a comment to explain the purpose
COMMENT ON COLUMN "deliverable_style_references"."example_output_url" IS 'URL to an example of generated output using this style';
