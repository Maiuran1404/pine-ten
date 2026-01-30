/**
 * Setup Slack Channels Script
 * Creates the initial channels needed for Slack integration
 *
 * Run with: npx tsx scripts/setup-slack-channels.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { WebClient } from "@slack/web-api";

const CHANNELS_TO_CREATE = [
  {
    name: "crafted-superadmin-alerts",
    envVar: "SLACK_SUPERADMIN_CHANNEL_ID",
    topic: "Critical alerts and system notifications from Crafted",
    purpose: "Superadmin alerts: errors, security events, important notifications",
    isPrivate: true,
  },
  {
    name: "crafted-new-signups",
    envVar: "SLACK_NEW_SIGNUPS_CHANNEL_ID",
    topic: "New client and freelancer signups",
    purpose: "Track all new user registrations on Crafted",
    isPrivate: false,
  },
  {
    name: "crafted-all-tasks",
    envVar: "SLACK_ALL_TASKS_CHANNEL_ID",
    topic: "All task activity feed",
    purpose: "Track task creation, assignment, completion, and status changes",
    isPrivate: false,
  },
  {
    name: "crafted-freelancer-applications",
    envVar: "SLACK_FREELANCER_APPS_CHANNEL_ID",
    topic: "Freelancer applications requiring review",
    purpose: "Review and approve/reject freelancer applications with quick actions",
    isPrivate: true,
  },
  {
    name: "crafted-credit-purchases",
    envVar: "SLACK_CREDIT_PURCHASES_CHANNEL_ID",
    topic: "Credit purchase activity",
    purpose: "Track all credit purchases and revenue",
    isPrivate: true,
  },
  {
    name: "crafted-pending-reviews",
    envVar: "SLACK_PENDING_REVIEWS_CHANNEL_ID",
    topic: "Deliverables pending admin review",
    purpose: "Review and verify deliverables before client review",
    isPrivate: true,
  },
];

async function main() {
  const token = process.env.SLACK_BOT_TOKEN;

  if (!token) {
    console.error("Error: SLACK_BOT_TOKEN not set in environment");
    process.exit(1);
  }

  const client = new WebClient(token);

  console.log("\n🔧 Setting up Slack channels for Crafted...\n");

  const channelIds: Record<string, string> = {};

  for (const channel of CHANNELS_TO_CREATE) {
    console.log(`Creating channel: #${channel.name}...`);

    try {
      // Try to create the channel
      const result = await client.conversations.create({
        name: channel.name,
        is_private: channel.isPrivate,
      });

      if (result.ok && result.channel?.id) {
        channelIds[channel.envVar] = result.channel.id;
        console.log(`  ✅ Created: ${result.channel.id}`);

        // Set topic and purpose
        await client.conversations.setTopic({
          channel: result.channel.id,
          topic: channel.topic,
        });

        await client.conversations.setPurpose({
          channel: result.channel.id,
          purpose: channel.purpose,
        });

        // Post welcome message
        await client.chat.postMessage({
          channel: result.channel.id,
          text: `Welcome to #${channel.name}! This channel is now connected to Crafted.`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `Welcome to #${channel.name}`,
                emoji: true,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Purpose:* ${channel.purpose}\n\nThis channel is now connected to the Crafted platform and will receive automated notifications.`,
              },
            },
            {
              type: "context",
              elements: [
                {
                  type: "mrkdwn",
                  text: `Set up on ${new Date().toLocaleDateString()}`,
                },
              ],
            },
          ],
        });
      }
    } catch (error: unknown) {
      // Channel might already exist
      const slackError = error as { data?: { error?: string } };
      if (slackError.data?.error === "name_taken") {
        console.log(`  ℹ️  Channel already exists, finding ID...`);

        // Find the existing channel
        const existing = await findChannelByName(client, channel.name, channel.isPrivate);
        if (existing) {
          channelIds[channel.envVar] = existing;
          console.log(`  ✅ Found existing: ${existing}`);
        } else {
          console.log(`  ⚠️  Could not find existing channel`);
        }
      } else {
        console.error(`  ❌ Error:`, slackError.data?.error || error);
      }
    }
  }

  // Output the environment variables to add
  console.log("\n" + "=".repeat(60));
  console.log("\n📋 Add these to your .env.local file:\n");
  console.log("# Slack Channel IDs");
  for (const [envVar, channelId] of Object.entries(channelIds)) {
    console.log(`${envVar}="${channelId}"`);
  }
  console.log("\n" + "=".repeat(60));

  // Test posting to the superadmin channel
  const superadminChannel = channelIds["SLACK_SUPERADMIN_CHANNEL_ID"];
  if (superadminChannel) {
    console.log("\n🧪 Testing notification to superadmin channel...");
    try {
      await client.chat.postMessage({
        channel: superadminChannel,
        text: "Test notification from setup script",
        blocks: [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: ":white_check_mark: *Slack Integration Test*\n\nIf you can see this message, your Slack integration is working correctly!",
            },
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `Sent from setup script at ${new Date().toISOString()}`,
              },
            ],
          },
        ],
      });
      console.log("  ✅ Test message sent successfully!\n");
    } catch (error) {
      console.error("  ❌ Failed to send test message:", error);
    }
  }

  console.log("✨ Slack setup complete!\n");
}

async function findChannelByName(
  client: WebClient,
  name: string,
  isPrivate: boolean
): Promise<string | null> {
  try {
    let cursor: string | undefined;
    do {
      const response = await client.conversations.list({
        types: isPrivate ? "private_channel" : "public_channel",
        limit: 200,
        cursor,
      });

      const channel = response.channels?.find((c) => c.name === name);
      if (channel?.id) {
        return channel.id;
      }

      cursor = response.response_metadata?.next_cursor;
    } while (cursor);

    return null;
  } catch (error) {
    console.error("Error finding channel:", error);
    return null;
  }
}

main().catch(console.error);
