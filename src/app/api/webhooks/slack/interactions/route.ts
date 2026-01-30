/**
 * Slack Interactions Webhook
 * Handles button clicks, modal submissions, and shortcuts from Slack
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, freelancerProfiles, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  verifySlackSignature,
  updateMessage,
  openModal,
  notifySlack,
} from "@/lib/slack";
import {
  freelancerApprovedBlock,
  freelancerRejectedBlock,
  taskVerifiedBlock,
  rejectFreelancerModal,
  requestTaskChangesModal,
} from "@/lib/slack/blocks";
import type { SlackInteractionPayload } from "@/lib/slack/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Get raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get("x-slack-signature") || "";
    const timestamp = request.headers.get("x-slack-request-timestamp") || "";

    // Verify signature
    if (!verifySlackSignature(signature, timestamp, rawBody)) {
      logger.warn("Invalid Slack signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload (Slack sends it as form-urlencoded)
    const params = new URLSearchParams(rawBody);
    const payloadStr = params.get("payload");

    if (!payloadStr) {
      return NextResponse.json({ error: "Missing payload" }, { status: 400 });
    }

    const payload: SlackInteractionPayload = JSON.parse(payloadStr);

    logger.info(
      { type: payload.type, user: payload.user?.username },
      "Slack interaction received"
    );

    // Handle different interaction types
    switch (payload.type) {
      case "block_actions":
        return handleBlockActions(payload);

      case "view_submission":
        return handleViewSubmission(payload);

      default:
        logger.warn({ type: payload.type }, "Unknown interaction type");
        return NextResponse.json({ ok: true });
    }
  } catch (error) {
    logger.error({ err: error }, "Slack interaction error");
    return NextResponse.json(
      { error: "Interaction handler failed" },
      { status: 500 }
    );
  }
}

async function handleBlockActions(
  payload: SlackInteractionPayload
): Promise<NextResponse> {
  if (!payload.actions || payload.actions.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const action = payload.actions[0];
  const actionId = action.action_id;
  const value = action.value || "";

  logger.info({ actionId, value }, "Processing block action");

  try {
    switch (actionId) {
      // Freelancer approval
      case "freelancer_approve":
        await handleFreelancerApprove(value, payload);
        break;

      case "freelancer_reject":
        await handleFreelancerRejectModal(value, payload);
        break;

      // Task verification
      case "task_verify":
        await handleTaskVerify(value, payload);
        break;

      case "task_request_changes":
        await handleTaskChangesModal(value, payload);
        break;

      default:
        // Link buttons (with url property) will trigger interactions but don't need handling
        // They just open the URL in the browser
        if (actionId.startsWith("link_")) {
          logger.info({ actionId }, "Link button clicked - no action needed");
        } else {
          logger.warn({ actionId }, "Unknown action ID");
        }
    }
  } catch (error) {
    logger.error({ err: error, actionId }, "Error handling block action");
  }

  return NextResponse.json({ ok: true });
}

async function handleViewSubmission(
  payload: SlackInteractionPayload
): Promise<NextResponse> {
  if (!payload.view) {
    return NextResponse.json({ ok: true });
  }

  const callbackId = payload.view.callback_id;
  const privateMetadata = payload.view.id; // We store IDs here

  logger.info({ callbackId }, "Processing view submission");

  try {
    switch (callbackId) {
      case "reject_freelancer_modal":
        await handleFreelancerRejectSubmit(payload);
        break;

      case "request_task_changes_modal":
        await handleTaskChangesSubmit(payload);
        break;

      default:
        logger.warn({ callbackId }, "Unknown callback ID");
    }
  } catch (error) {
    logger.error({ err: error, callbackId }, "Error handling view submission");
  }

  return NextResponse.json({ ok: true });
}

// ============================================
// Freelancer Actions
// ============================================

async function handleFreelancerApprove(
  userId: string,
  payload: SlackInteractionPayload
): Promise<void> {
  // Get freelancer profile
  const profile = await db.query.freelancerProfiles.findFirst({
    where: eq(freelancerProfiles.userId, userId),
  });

  if (!profile) {
    logger.error({ userId }, "Freelancer profile not found");
    return;
  }

  // Update status
  await db
    .update(freelancerProfiles)
    .set({
      status: "APPROVED",
      updatedAt: new Date(),
    })
    .where(eq(freelancerProfiles.userId, userId));

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return;

  // Update the Slack message
  if (payload.channel?.id && payload.message?.ts) {
    await updateMessage(
      payload.channel.id,
      payload.message.ts,
      freelancerApprovedBlock(
        {
          id: profile.id,
          userId: user.id,
          name: user.name,
          email: user.email,
          status: "APPROVED",
          skills: (profile.skills as string[]) || [],
          portfolioUrls: (profile.portfolioUrls as string[]) || [],
          hourlyRate: profile.hourlyRate?.toString(),
        },
        payload.user.name
      ),
      `Freelancer ${user.name} approved by ${payload.user.name}`
    );
  }

  // Send notification to freelancer
  await notifySlack("FREELANCER_APPROVED", {
    freelancer: {
      id: profile.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      status: "APPROVED",
      skills: (profile.skills as string[]) || [],
      portfolioUrls: (profile.portfolioUrls as string[]) || [],
    },
    approvedBy: payload.user.name,
  });

  logger.info({ userId, approvedBy: payload.user.name }, "Freelancer approved via Slack");
}

async function handleFreelancerRejectModal(
  userId: string,
  payload: SlackInteractionPayload
): Promise<void> {
  // Get user info for modal
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    logger.error({ userId }, "User not found for rejection modal");
    return;
  }

  // Open rejection modal
  await openModal(
    payload.trigger_id,
    rejectFreelancerModal(userId, user.name)
  );
}

async function handleFreelancerRejectSubmit(
  payload: SlackInteractionPayload
): Promise<void> {
  if (!payload.view) return;

  // Get freelancer ID from private_metadata
  // Note: We need to properly pass this - for now extract from view
  const userId = (payload.view as { private_metadata?: string }).private_metadata;
  if (!userId) {
    logger.error("No userId in modal metadata");
    return;
  }

  // Get rejection reason
  const reason =
    payload.view.state?.values?.rejection_reason?.reason_input?.value || "";

  // Update status
  await db
    .update(freelancerProfiles)
    .set({
      status: "REJECTED",
      updatedAt: new Date(),
    })
    .where(eq(freelancerProfiles.userId, userId));

  // Get user info
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) return;

  const profile = await db.query.freelancerProfiles.findFirst({
    where: eq(freelancerProfiles.userId, userId),
  });

  // Notify
  await notifySlack("FREELANCER_REJECTED", {
    freelancer: {
      id: profile?.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      status: "REJECTED",
      skills: (profile?.skills as string[]) || [],
      portfolioUrls: (profile?.portfolioUrls as string[]) || [],
    },
    rejectedBy: payload.user.name,
    reason,
  });

  logger.info({ userId, rejectedBy: payload.user.name }, "Freelancer rejected via Slack");
}

// ============================================
// Task Actions
// ============================================

async function handleTaskVerify(
  taskId: string,
  payload: SlackInteractionPayload
): Promise<void> {
  // Get task
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    logger.error({ taskId }, "Task not found for verification");
    return;
  }

  // Update task status from PENDING_ADMIN_REVIEW to IN_REVIEW
  await db
    .update(tasks)
    .set({
      status: "IN_REVIEW",
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  // Update the Slack message
  if (payload.channel?.id && payload.message?.ts) {
    await updateMessage(
      payload.channel.id,
      payload.message.ts,
      taskVerifiedBlock(
        {
          id: task.id,
          title: task.title,
          description: task.description,
          status: "IN_REVIEW",
          credits: task.creditsUsed,
          clientName: "",
          clientEmail: "",
          createdAt: task.createdAt,
        },
        payload.user.name
      ),
      `Task verified by ${payload.user.name}`
    );
  }

  logger.info({ taskId, verifiedBy: payload.user.name }, "Task verified via Slack");
}

async function handleTaskChangesModal(
  taskId: string,
  payload: SlackInteractionPayload
): Promise<void> {
  // Get task info for modal
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) {
    logger.error({ taskId }, "Task not found for changes modal");
    return;
  }

  // Open changes modal
  await openModal(
    payload.trigger_id,
    requestTaskChangesModal(taskId, task.title)
  );
}

async function handleTaskChangesSubmit(
  payload: SlackInteractionPayload
): Promise<void> {
  if (!payload.view) return;

  // Get task ID from private_metadata
  const taskId = (payload.view as { private_metadata?: string }).private_metadata;
  if (!taskId) {
    logger.error("No taskId in modal metadata");
    return;
  }

  // Get feedback
  const feedback =
    payload.view.state?.values?.change_feedback?.feedback_input?.value || "";

  if (!feedback) {
    logger.warn("No feedback provided for task changes");
    return;
  }

  // Get task
  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });

  if (!task) return;

  // Update task status to REVISION_REQUESTED
  await db
    .update(tasks)
    .set({
      status: "REVISION_REQUESTED",
      revisionsUsed: (task.revisionsUsed || 0) + 1,
      updatedAt: new Date(),
    })
    .where(eq(tasks.id, taskId));

  // Get client and freelancer info
  const [client, freelancer] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, task.clientId) }),
    task.freelancerId
      ? db.query.users.findFirst({ where: eq(users.id, task.freelancerId) })
      : null,
  ]);

  // Notify
  await notifySlack("REVISION_REQUESTED", {
    task: {
      id: task.id,
      title: task.title,
      description: task.description,
      status: "REVISION_REQUESTED",
      credits: task.creditsUsed,
      clientName: client?.name || "Unknown",
      clientEmail: client?.email || "",
      freelancerName: freelancer?.name,
      freelancerEmail: freelancer?.email,
      createdAt: task.createdAt,
    },
    feedback,
  });

  logger.info(
    { taskId, requestedBy: payload.user.name },
    "Task changes requested via Slack"
  );
}
