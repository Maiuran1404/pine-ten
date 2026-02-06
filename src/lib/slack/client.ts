/**
 * Slack Web API Client
 * Provides core functionality for interacting with Slack
 */

import { WebClient, type ChatPostMessageResponse } from "@slack/web-api";
import type { Block, KnownBlock } from "@slack/web-api";
import { logger } from "@/lib/logger";

// Initialize client lazily to avoid issues during build
let slackClient: WebClient | null = null;

function getClient(): WebClient {
  if (!slackClient) {
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) {
      throw new Error("SLACK_BOT_TOKEN is not configured");
    }
    slackClient = new WebClient(token);
  }
  return slackClient;
}

// Check if Slack is configured
export function isSlackConfigured(): boolean {
  return !!process.env.SLACK_BOT_TOKEN;
}

// Get channel IDs from environment
export function getChannelConfig() {
  return {
    superadminAlerts: process.env.SLACK_SUPERADMIN_CHANNEL_ID || "",
    newSignups: process.env.SLACK_NEW_SIGNUPS_CHANNEL_ID || "",
    allTasks: process.env.SLACK_ALL_TASKS_CHANNEL_ID || "",
    freelancerApps: process.env.SLACK_FREELANCER_APPS_CHANNEL_ID || "",
    creditPurchases: process.env.SLACK_CREDIT_PURCHASES_CHANNEL_ID || "",
    pendingReviews: process.env.SLACK_PENDING_REVIEWS_CHANNEL_ID || "",
  };
}

// Post a message to a channel
export async function postMessage(
  channelId: string,
  blocks: (Block | KnownBlock)[],
  text: string, // Fallback text for notifications
  options?: {
    threadTs?: string;
    unfurlLinks?: boolean;
    unfurlMedia?: boolean;
  }
): Promise<{ success: boolean; ts?: string; error?: string }> {
  if (!isSlackConfigured()) {
    logger.warn("[Slack] Not configured, skipping message");
    return { success: false, error: "Slack not configured" };
  }

  if (!channelId) {
    logger.warn("[Slack] No channel ID provided, skipping message");
    return { success: false, error: "No channel ID provided" };
  }

  try {
    const client = getClient();
    const response: ChatPostMessageResponse = await client.chat.postMessage({
      channel: channelId,
      blocks,
      text,
      thread_ts: options?.threadTs,
      unfurl_links: options?.unfurlLinks ?? false,
      unfurl_media: options?.unfurlMedia ?? true,
    });

    return {
      success: response.ok ?? false,
      ts: response.ts,
    };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to post message");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Update an existing message
export async function updateMessage(
  channelId: string,
  ts: string,
  blocks: (Block | KnownBlock)[],
  text: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();
    const response = await client.chat.update({
      channel: channelId,
      ts,
      blocks,
      text,
    });

    return { success: response.ok ?? false };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to update message");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Create a channel
export async function createChannel(
  name: string,
  isPrivate: boolean = false
): Promise<{ success: boolean; channelId?: string; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();

    // Sanitize channel name (lowercase, no spaces, max 80 chars)
    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);

    const response = await client.conversations.create({
      name: sanitizedName,
      is_private: isPrivate,
    });

    return {
      success: response.ok ?? false,
      channelId: response.channel?.id,
    };
  } catch (error: unknown) {
    // Channel might already exist
    if (error && typeof error === "object" && "data" in error) {
      const slackError = error as { data?: { error?: string } };
      if (slackError.data?.error === "name_taken") {
        // Try to find existing channel
        const existing = await findChannelByName(name);
        if (existing) {
          return { success: true, channelId: existing };
        }
      }
    }

    logger.error({ err: error }, "[Slack] Failed to create channel");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Find a channel by name
export async function findChannelByName(
  name: string
): Promise<string | null> {
  if (!isSlackConfigured()) {
    return null;
  }

  try {
    const client = getClient();
    const sanitizedName = name
      .toLowerCase()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-+/g, "-");

    // List all channels (paginated)
    let cursor: string | undefined;
    do {
      const response = await client.conversations.list({
        types: "public_channel,private_channel",
        limit: 200,
        cursor,
      });

      const channel = response.channels?.find(
        (c) => c.name === sanitizedName
      );
      if (channel?.id) {
        return channel.id;
      }

      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    return null;
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to find channel");
    return null;
  }
}

// Archive a channel
export async function archiveChannel(
  channelId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();
    const response = await client.conversations.archive({
      channel: channelId,
    });

    return { success: response.ok ?? false };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to archive channel");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Invite users to a channel
export async function inviteToChannel(
  channelId: string,
  userIds: string[]
): Promise<{ success: boolean; error?: string }> {
  if (!isSlackConfigured() || userIds.length === 0) {
    return { success: false, error: "Slack not configured or no users" };
  }

  try {
    const client = getClient();
    const response = await client.conversations.invite({
      channel: channelId,
      users: userIds.join(","),
    });

    return { success: response.ok ?? false };
  } catch (error: unknown) {
    // User might already be in channel
    if (error && typeof error === "object" && "data" in error) {
      const slackError = error as { data?: { error?: string } };
      if (slackError.data?.error === "already_in_channel") {
        return { success: true };
      }
    }

    logger.error({ err: error }, "[Slack] Failed to invite to channel");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Remove a user from a channel
export async function removeFromChannel(
  channelId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();
    const response = await client.conversations.kick({
      channel: channelId,
      user: userId,
    });

    return { success: response.ok ?? false };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to remove from channel");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Look up a Slack user by email
export async function lookupUserByEmail(
  email: string
): Promise<{ success: boolean; userId?: string; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();
    const response = await client.users.lookupByEmail({
      email,
    });

    return {
      success: response.ok ?? false,
      userId: response.user?.id,
    };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to lookup user by email");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Open a DM channel with a user
export async function openDM(
  userId: string
): Promise<{ success: boolean; channelId?: string; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();
    const response = await client.conversations.open({
      users: userId,
    });

    return {
      success: response.ok ?? false,
      channelId: response.channel?.id,
    };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to open DM");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Send a DM to a user
export async function sendDM(
  userId: string,
  blocks: (Block | KnownBlock)[],
  text: string
): Promise<{ success: boolean; ts?: string; error?: string }> {
  const dm = await openDM(userId);
  if (!dm.success || !dm.channelId) {
    return { success: false, error: dm.error || "Failed to open DM" };
  }

  return postMessage(dm.channelId, blocks, text);
}

// Upload a file
export async function uploadFile(
  channels: string[],
  fileBuffer: Buffer,
  filename: string,
  title?: string
): Promise<{ success: boolean; fileId?: string; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();
    const response = await client.files.uploadV2({
      channel_id: channels[0],
      file: fileBuffer,
      filename,
      title: title || filename,
    });

    return {
      success: response.ok ?? false,
      fileId: (response as { file?: { id?: string } }).file?.id,
    };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to upload file");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Set channel topic
export async function setChannelTopic(
  channelId: string,
  topic: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();
    const response = await client.conversations.setTopic({
      channel: channelId,
      topic,
    });

    return { success: response.ok ?? false };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to set channel topic");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Open a modal
export async function openModal(
  triggerId: string,
  view: object
): Promise<{ success: boolean; viewId?: string; error?: string }> {
  if (!isSlackConfigured()) {
    return { success: false, error: "Slack not configured" };
  }

  try {
    const client = getClient();
    const response = await client.views.open({
      trigger_id: triggerId,
      view: view as Parameters<typeof client.views.open>[0]["view"],
    });

    return {
      success: response.ok ?? false,
      viewId: response.view?.id,
    };
  } catch (error) {
    logger.error({ err: error }, "[Slack] Failed to open modal");
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Verify Slack request signature
export function verifySlackSignature(
  signature: string,
  timestamp: string,
  body: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) {
    logger.error("[Slack] SLACK_SIGNING_SECRET not configured");
    return false;
  }

  // Check timestamp is within 5 minutes
  const now = Math.floor(Date.now() / 1000);
  const timeDiff = Math.abs(now - parseInt(timestamp));
  if (timeDiff > 60 * 5) {
    logger.error({ timeDiff, now, timestamp }, "[Slack] Request timestamp too old");
    return false;
  }

  // Compute expected signature
  const crypto = require("crypto");
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature =
    "v0=" +
    crypto
      .createHmac("sha256", signingSecret)
      .update(sigBasestring)
      .digest("hex");

  // Compare signatures using timing-safe comparison
  try {
    const isValid = crypto.timingSafeEqual(
      Buffer.from(mySignature),
      Buffer.from(signature)
    );
    if (!isValid) {
      logger.error({
        received: signature.slice(0, 20) + "...",
        expected: mySignature.slice(0, 20) + "...",
        bodyLength: body.length,
        signingSecretLength: signingSecret.length,
      }, "[Slack] Signature mismatch");
    }
    return isValid;
  } catch (err) {
    logger.error({ err }, "[Slack] Signature comparison error");
    return false;
  }
}
