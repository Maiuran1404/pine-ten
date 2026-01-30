/**
 * Slack Events Webhook
 * Handles event subscriptions from Slack (optional - for future features)
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySlackSignature } from "@/lib/slack";
import { logger } from "@/lib/logger";

interface SlackEventPayload {
  type: "url_verification" | "event_callback";
  challenge?: string;
  token?: string;
  team_id?: string;
  event?: {
    type: string;
    user?: string;
    channel?: string;
    text?: string;
    ts?: string;
    [key: string]: unknown;
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-slack-signature") || "";
    const timestamp = request.headers.get("x-slack-request-timestamp") || "";

    // Parse payload first to check for url_verification (doesn't need signature)
    const payload: SlackEventPayload = JSON.parse(rawBody);

    // Handle URL verification challenge (Slack sends this when setting up)
    if (payload.type === "url_verification") {
      logger.info("Slack URL verification challenge received");
      return NextResponse.json({ challenge: payload.challenge });
    }

    // Verify signature for all other requests
    if (!verifySlackSignature(signature, timestamp, rawBody)) {
      logger.warn("Invalid Slack signature for event");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Handle event callbacks
    if (payload.type === "event_callback" && payload.event) {
      await handleEvent(payload.event);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error({ err: error }, "Slack event webhook error");
    return NextResponse.json(
      { error: "Event handler failed" },
      { status: 500 }
    );
  }
}

async function handleEvent(event: NonNullable<SlackEventPayload["event"]>) {
  logger.info({ type: event.type }, "Slack event received");

  switch (event.type) {
    case "message":
      // Future: Bridge messages from Slack to task messages
      // For now, just log
      logger.info(
        { channel: event.channel, text: event.text?.slice(0, 100) },
        "Message event received"
      );
      break;

    case "member_joined_channel":
      logger.info(
        { user: event.user, channel: event.channel },
        "Member joined channel"
      );
      break;

    case "member_left_channel":
      logger.info(
        { user: event.user, channel: event.channel },
        "Member left channel"
      );
      break;

    case "app_mention":
      // Future: Handle @mentions of the bot
      logger.info(
        { channel: event.channel, text: event.text?.slice(0, 100) },
        "App mentioned"
      );
      break;

    case "reaction_added":
      // Future: Track engagement via reactions
      logger.info(
        { reaction: (event as { reaction?: string }).reaction },
        "Reaction added"
      );
      break;

    default:
      logger.debug({ type: event.type }, "Unhandled event type");
  }
}
