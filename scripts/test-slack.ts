/**
 * Test script to verify Slack integration
 * Run with: npx tsx scripts/test-slack.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { WebClient } from "@slack/web-api";

async function testSlackIntegration() {
  console.log("=== Slack Integration Test ===\n");

  // 1. Check if Slack is configured
  console.log("1. Checking Slack configuration...");
  const token = process.env.SLACK_BOT_TOKEN;
  const configured = !!token;
  console.log(`   Slack configured: ${configured ? "✓ YES" : "✗ NO"}`);

  if (!configured) {
    console.error(
      "\n❌ SLACK_BOT_TOKEN is not set. Please configure Slack environment variables."
    );
    process.exit(1);
  }

  // 2. Get channel config
  console.log("\n2. Channel configuration:");
  const channels = {
    superadminAlerts: process.env.SLACK_SUPERADMIN_CHANNEL_ID || "",
    newSignups: process.env.SLACK_NEW_SIGNUPS_CHANNEL_ID || "",
    allTasks: process.env.SLACK_ALL_TASKS_CHANNEL_ID || "",
    freelancerApps: process.env.SLACK_FREELANCER_APPS_CHANNEL_ID || "",
    creditPurchases: process.env.SLACK_CREDIT_PURCHASES_CHANNEL_ID || "",
    pendingReviews: process.env.SLACK_PENDING_REVIEWS_CHANNEL_ID || "",
  };

  Object.entries(channels).forEach(([name, id]) => {
    console.log(`   ${name}: ${id ? "✓ " + id : "✗ NOT SET"}`);
  });

  // Initialize client
  const client = new WebClient(token);

  // 3. Test auth
  console.log("\n3. Testing Slack authentication...");
  try {
    const authResult = await client.auth.test();
    console.log(`   Bot User: ${authResult.user}`);
    console.log(`   Team: ${authResult.team}`);
    console.log(`   Auth: ✓ SUCCESS`);
  } catch (error) {
    console.error(`   Auth: ✗ FAILED`, error);
    process.exit(1);
  }

  // 4. Test posting messages to each configured channel
  console.log("\n4. Testing message posting to channels...\n");

  const testMessage = (channelName: string) => [
    {
      type: "section" as const,
      text: {
        type: "mrkdwn" as const,
        text: `:test_tube: *Slack Integration Test - ${channelName}*\n\nThis is a test message to verify the Slack integration is working correctly.\n\nTimestamp: ${new Date().toISOString()}`,
      },
    },
  ];

  // Test each channel
  for (const [name, channelId] of Object.entries(channels)) {
    if (!channelId) {
      console.log(`   ${name}: ⏭ SKIPPED (not configured)`);
      continue;
    }

    console.log(`   Testing ${name} (${channelId})...`);
    try {
      const result = await client.chat.postMessage({
        channel: channelId,
        blocks: testMessage(name),
        text: `Slack integration test - ${name}`,
      });
      console.log(`   ${name}: ${result.ok ? "✓ SUCCESS" : "✗ FAILED"}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   ${name}: ✗ FAILED - ${errorMsg}`);
    }
  }

  // 5. Test interactive message (like what would appear for freelancer applications)
  console.log("\n5. Testing interactive message (freelancer application style)...");
  if (channels.freelancerApps) {
    try {
      const result = await client.chat.postMessage({
        channel: channels.freelancerApps,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🧪 Test Freelancer Application",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: "*Name:*\nTest Freelancer" },
              { type: "mrkdwn", text: "*Email:*\ntest@example.com" },
              { type: "mrkdwn", text: "*Skills:*\nUI Design, Illustration" },
              { type: "mrkdwn", text: "*Hourly Rate:*\n$50/hr" },
            ],
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "*Portfolio:*\n• <https://example.com/portfolio|Portfolio Site>",
            },
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "✓ Approve", emoji: true },
                style: "primary",
                action_id: "freelancer_approve",
                value: "test-user-id-123",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "✗ Reject", emoji: true },
                style: "danger",
                action_id: "freelancer_reject",
                value: "test-user-id-123",
              },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `⚠️ This is a TEST message - buttons will not work | ${new Date().toISOString()}`,
              },
            ],
          },
        ],
        text: "Test freelancer application",
      });
      console.log(`   Interactive message: ${result.ok ? "✓ SUCCESS" : "✗ FAILED"}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   Interactive message: ✗ FAILED - ${errorMsg}`);
    }
  }

  // 6. Test task pending review message (with verify/request changes buttons)
  console.log("\n6. Testing task pending review message...");
  if (channels.pendingReviews) {
    try {
      const result = await client.chat.postMessage({
        channel: channels.pendingReviews,
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "📦 Test Deliverable Pending Review",
              emoji: true,
            },
          },
          {
            type: "section",
            fields: [
              { type: "mrkdwn", text: "*Task:*\nTest Task Title" },
              { type: "mrkdwn", text: "*Client:*\nTest Client" },
              { type: "mrkdwn", text: "*Freelancer:*\nTest Freelancer" },
              { type: "mrkdwn", text: "*Credits:*\n10" },
            ],
          },
          {
            type: "actions",
            elements: [
              {
                type: "button",
                text: { type: "plain_text", text: "✓ Verify", emoji: true },
                style: "primary",
                action_id: "task_verify",
                value: "test-task-id-123",
              },
              {
                type: "button",
                text: { type: "plain_text", text: "↩ Request Changes", emoji: true },
                action_id: "task_request_changes",
                value: "test-task-id-123",
              },
            ],
          },
          {
            type: "context",
            elements: [
              {
                type: "mrkdwn",
                text: `⚠️ This is a TEST message - buttons will not work | ${new Date().toISOString()}`,
              },
            ],
          },
        ],
        text: "Test deliverable pending review",
      });
      console.log(`   Pending review message: ${result.ok ? "✓ SUCCESS" : "✗ FAILED"}`);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.log(`   Pending review message: ✗ FAILED - ${errorMsg}`);
    }
  }

  console.log("\n=== Test Complete ===");
  console.log(
    "\n✅ Please check your Slack workspace to verify the messages were received."
  );
  console.log("   - Look for test messages in each configured channel");
  console.log("   - Interactive buttons should be visible (but won't work since they reference test IDs)");
}

testSlackIntegration().catch((error) => {
  console.error("Test failed with error:", error);
  process.exit(1);
});
