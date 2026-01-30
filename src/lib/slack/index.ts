/**
 * Slack Integration
 * Main exports for Slack functionality
 */

// Client functions
export {
  isSlackConfigured,
  getChannelConfig,
  postMessage,
  updateMessage,
  createChannel,
  findChannelByName,
  archiveChannel,
  inviteToChannel,
  removeFromChannel,
  lookupUserByEmail,
  openDM,
  sendDM,
  uploadFile,
  setChannelTopic,
  openModal,
  verifySlackSignature,
} from "./client";

// Channel management
export {
  getOrCreateClientChannel,
  addArtistToClientChannel,
  removeArtistFromClientChannel,
  syncClientChannelMembers,
  getClientChannelId,
} from "./channels";

// Notifications
export { notifySlack } from "./notifications";

// Block builders
export * as slackBlocks from "./blocks";

// Event type constants
export { SlackEventType } from "./types";

// Types
export type {
  SlackEventType as SlackEventTypeValue,
  SlackChannelType,
  SlackUserInfo,
  SlackTaskInfo,
  SlackFreelancerInfo,
  SlackCreditPurchaseInfo,
  SlackCompanyInfo,
  SlackInteractionPayload,
  SlackChannelConfig,
  SlackNotificationResult,
} from "./types";
