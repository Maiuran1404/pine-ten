-- Add briefing_state jsonb column to chat_drafts table
-- Stores serialized BriefingState for the state-machine-driven creative briefing flow

ALTER TABLE "chat_drafts" ADD COLUMN IF NOT EXISTS "briefing_state" jsonb;

COMMENT ON COLUMN "chat_drafts"."briefing_state" IS 'Serialized BriefingState for the state-machine-driven creative briefing flow';
