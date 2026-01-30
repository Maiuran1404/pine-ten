/**
 * Slack Integration Types
 */

// Slack event types for notifications
export type SlackEventType =
  // User events
  | "NEW_CLIENT_SIGNUP"
  | "NEW_FREELANCER_SIGNUP"
  | "FREELANCER_APPLICATION"
  | "FREELANCER_APPROVED"
  | "FREELANCER_REJECTED"
  // Task events
  | "TASK_CREATED"
  | "TASK_ASSIGNED"
  | "TASK_STARTED"
  | "TASK_SUBMITTED"
  | "TASK_PENDING_REVIEW"
  | "TASK_APPROVED"
  | "TASK_COMPLETED"
  | "REVISION_REQUESTED"
  | "TASK_CANCELLED"
  // Credit events
  | "CREDIT_PURCHASE"
  | "LOW_CREDITS"
  // System events
  | "SYSTEM_ERROR"
  | "SECURITY_ALERT";

// Event type constants for easy access
export const SlackEventType = {
  NEW_CLIENT_SIGNUP: "NEW_CLIENT_SIGNUP" as const,
  NEW_FREELANCER_SIGNUP: "NEW_FREELANCER_SIGNUP" as const,
  FREELANCER_APPLICATION: "FREELANCER_APPLICATION" as const,
  FREELANCER_APPROVED: "FREELANCER_APPROVED" as const,
  FREELANCER_REJECTED: "FREELANCER_REJECTED" as const,
  TASK_CREATED: "TASK_CREATED" as const,
  TASK_ASSIGNED: "TASK_ASSIGNED" as const,
  TASK_STARTED: "TASK_STARTED" as const,
  TASK_SUBMITTED: "TASK_SUBMITTED" as const,
  TASK_PENDING_REVIEW: "TASK_PENDING_REVIEW" as const,
  TASK_APPROVED: "TASK_APPROVED" as const,
  TASK_COMPLETED: "TASK_COMPLETED" as const,
  REVISION_REQUESTED: "REVISION_REQUESTED" as const,
  TASK_CANCELLED: "TASK_CANCELLED" as const,
  CREDIT_PURCHASE: "CREDIT_PURCHASE" as const,
  LOW_CREDITS: "LOW_CREDITS" as const,
  SYSTEM_ERROR: "SYSTEM_ERROR" as const,
  SECURITY_ALERT: "SECURITY_ALERT" as const,
};

// Channel types
export type SlackChannelType =
  | "SUPERADMIN_ALERTS"
  | "NEW_SIGNUPS"
  | "ALL_TASKS"
  | "FREELANCER_APPS"
  | "CREDIT_PURCHASES"
  | "PENDING_REVIEWS"
  | "CLIENT_CHANNEL";

// User info for Slack messages
export interface SlackUserInfo {
  id: string;
  name: string;
  email: string;
  role: "CLIENT" | "FREELANCER" | "ADMIN";
  slackUserId?: string;
}

// Task info for Slack messages
export interface SlackTaskInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  category?: string;
  credits: number;
  clientName: string;
  clientEmail: string;
  freelancerName?: string;
  freelancerEmail?: string;
  deadline?: Date;
  createdAt: Date;
}

// Company info for Slack messages
export interface SlackCompanyInfo {
  id: string;
  name: string;
  industry?: string;
  slackChannelId?: string;
}

// Freelancer profile info
export interface SlackFreelancerInfo {
  id: string;
  userId: string;
  name: string;
  email: string;
  status: string;
  skills: string[];
  portfolioUrls: string[];
  hourlyRate?: string;
  whatsappNumber?: string;
}

// Credit purchase info
export interface SlackCreditPurchaseInfo {
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  credits: number;
  newBalance: number;
  stripePaymentId?: string;
}

// Interaction payload from Slack
export interface SlackInteractionPayload {
  type: "block_actions" | "view_submission" | "shortcut";
  user: {
    id: string;
    username: string;
    name: string;
  };
  trigger_id: string;
  response_url: string;
  actions?: Array<{
    action_id: string;
    block_id: string;
    value?: string;
    type: string;
  }>;
  view?: {
    id: string;
    callback_id: string;
    state: {
      values: Record<string, Record<string, { value: string }>>;
    };
  };
  channel?: {
    id: string;
    name: string;
  };
  message?: {
    ts: string;
    text: string;
  };
}

// Channel config from env
export interface SlackChannelConfig {
  superadminAlerts: string;
  newSignups: string;
  allTasks: string;
  freelancerApps: string;
  creditPurchases: string;
  pendingReviews: string;
}

// Slack notification result
export interface SlackNotificationResult {
  success: boolean;
  channel?: string;
  ts?: string;
  error?: string;
}
