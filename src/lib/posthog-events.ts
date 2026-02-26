/**
 * PostHog event name constants and property types.
 * All events use snake_case with pattern {domain}_{action}.
 */

// =============================================================================
// EVENT NAME CONSTANTS
// =============================================================================

export const PostHogEvents = {
  // Auth
  USER_SIGNED_UP: 'user_signed_up',
  USER_LOGGED_IN: 'user_logged_in',
  USER_LOGGED_OUT: 'user_logged_out',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',

  // Briefing
  BRIEFING_STARTED: 'briefing_started',
  BRIEFING_STAGE_ENTERED: 'briefing_stage_entered',
  BRIEFING_MESSAGE_SENT: 'briefing_message_sent',
  BRIEFING_STYLE_SELECTED: 'briefing_style_selected',
  BRIEFING_MOODBOARD_ITEM_ADDED: 'briefing_moodboard_item_added',
  BRIEFING_COMPLETED: 'briefing_completed',
  BRIEFING_ABANDONED: 'briefing_abandoned',

  // Tasks
  TASK_CREATED: 'task_created',
  TASK_ASSIGNED: 'task_assigned',
  TASK_DELIVERABLE_SUBMITTED: 'task_deliverable_submitted',
  TASK_APPROVED: 'task_approved',
  TASK_REVISION_REQUESTED: 'task_revision_requested',
  TASK_COMPLETED: 'task_completed',
  TASK_CANCELLED: 'task_cancelled',

  // Credits
  CREDIT_PURCHASE_INITIATED: 'credit_purchase_initiated',
  CREDIT_PURCHASE_COMPLETED: 'credit_purchase_completed',
  CREDITS_USED: 'credits_used',
  INSUFFICIENT_CREDITS_SHOWN: 'insufficient_credits_shown',

  // Freelancer
  TASK_OFFER_RECEIVED: 'task_offer_received',
  TASK_OFFER_ACCEPTED: 'task_offer_accepted',
  TASK_OFFER_DECLINED: 'task_offer_declined',
  TASK_CLAIMED: 'task_claimed',

  // Admin
  ADMIN_TASK_REVIEWED: 'admin_task_reviewed',
  ADMIN_FREELANCER_APPROVED: 'admin_freelancer_approved',
  ADMIN_DELIVERABLE_VERIFIED: 'admin_deliverable_verified',
} as const

export type PostHogEventName = (typeof PostHogEvents)[keyof typeof PostHogEvents]

// =============================================================================
// EVENT PROPERTY TYPES
// =============================================================================

export interface TaskCreatedProperties {
  task_id: string
  category: string | null
  credits_used: number
  complexity: string
  urgency: string
  match_score: number | null
  assigned_to: string | null
  $source: 'server'
}

export interface CreditPurchaseCompletedProperties {
  user_id: string
  credits_purchased: number
  new_balance: number
  $source: 'server'
}

export interface TaskClaimedProperties {
  task_id: string
  $source: 'server'
}

export interface TaskDeliverableSubmittedProperties {
  task_id: string
  file_count: number
  $source: 'server'
}

export interface AdminTaskReviewedProperties {
  task_id: string
  action: string
  $source: 'server'
}

export interface BriefingStageEnteredProperties {
  stage: string
  previous_stage: string | null
  $source: 'client'
}

export interface BriefingCompletedProperties {
  task_id: string
  credits_used: number
  $source: 'client'
}
