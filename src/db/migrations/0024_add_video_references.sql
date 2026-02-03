-- Add video support fields to deliverable_style_references
-- This enables storing YouTube video references for launch videos and other video deliverables

ALTER TABLE "deliverable_style_references" ADD COLUMN IF NOT EXISTS "video_url" text;
ALTER TABLE "deliverable_style_references" ADD COLUMN IF NOT EXISTS "video_thumbnail_url" text;
ALTER TABLE "deliverable_style_references" ADD COLUMN IF NOT EXISTS "video_duration" text;
ALTER TABLE "deliverable_style_references" ADD COLUMN IF NOT EXISTS "video_tags" jsonb DEFAULT '[]'::jsonb;

-- Create index for video references (for quick filtering of video-based styles)
CREATE INDEX IF NOT EXISTS "dsr_video_url_idx" ON "deliverable_style_references" ("video_url") WHERE "video_url" IS NOT NULL;

-- Create index for video tags (for tag-based filtering)
CREATE INDEX IF NOT EXISTS "dsr_video_tags_idx" ON "deliverable_style_references" USING GIN ("video_tags") WHERE "video_tags" IS NOT NULL;

COMMENT ON COLUMN "deliverable_style_references"."video_url" IS 'YouTube or other video URL for video style references';
COMMENT ON COLUMN "deliverable_style_references"."video_thumbnail_url" IS 'Cached thumbnail URL from the video';
COMMENT ON COLUMN "deliverable_style_references"."video_duration" IS 'Video duration in format like 1:30';
COMMENT ON COLUMN "deliverable_style_references"."video_tags" IS 'Tags for video categorization (cinematic, fast-paced, tech, etc.)';
