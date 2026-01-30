/**
 * Slack Block Kit Message Builders
 * Creates rich, interactive message layouts
 */

import type { Block, KnownBlock } from "@slack/web-api";
import type {
  SlackUserInfo,
  SlackTaskInfo,
  SlackFreelancerInfo,
  SlackCreditPurchaseInfo,
  SlackCompanyInfo,
} from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.getcrafted.ai";

// Helper to create divider
function divider(): KnownBlock {
  return { type: "divider" };
}

// Helper to create context block
function context(text: string): KnownBlock {
  return {
    type: "context",
    elements: [{ type: "mrkdwn", text }],
  };
}

// Helper to create section with text
function section(text: string, accessory?: object): KnownBlock {
  const block: KnownBlock = {
    type: "section",
    text: { type: "mrkdwn", text },
  };
  if (accessory) {
    (block as { accessory?: object }).accessory = accessory;
  }
  return block;
}

// Helper to create header
function header(text: string): KnownBlock {
  return {
    type: "header",
    text: { type: "plain_text", text, emoji: true },
  };
}

// Helper to create actions block
function actions(elements: object[], blockId?: string): KnownBlock {
  return {
    type: "actions",
    block_id: blockId,
    elements: elements as KnownBlock["elements" & keyof KnownBlock],
  } as KnownBlock;
}

// Helper to create button
function button(
  text: string,
  actionId: string,
  value: string,
  style?: "primary" | "danger"
): object {
  const btn: Record<string, unknown> = {
    type: "button",
    text: { type: "plain_text", text, emoji: true },
    action_id: actionId,
    value,
  };
  if (style) btn.style = style;
  return btn;
}

// Helper to create link button
// Link buttons open a URL when clicked. Slack still sends interaction payloads for these.
function linkButton(text: string, url: string, actionId?: string): object {
  return {
    type: "button",
    text: { type: "plain_text", text, emoji: true },
    action_id: actionId || `link_${Date.now()}`,
    url,
  };
}

// Format date for display
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================
// User Event Blocks
// ============================================

export function newClientSignupBlock(user: SlackUserInfo, company?: SlackCompanyInfo): (Block | KnownBlock)[] {
  return [
    header("New Client Signup"),
    divider(),
    section(
      `*${user.name}*\n` +
      `Email: ${user.email}\n` +
      (company ? `Company: ${company.name}\n` : "") +
      (company?.industry ? `Industry: ${company.industry}` : "")
    ),
    context(`Signed up at ${formatDate(new Date())}`),
    actions([
      linkButton("View in Dashboard", `${APP_URL}/admin/users/${user.id}`),
    ]),
  ];
}

export function newFreelancerSignupBlock(user: SlackUserInfo): (Block | KnownBlock)[] {
  return [
    header("New Freelancer Signup"),
    divider(),
    section(
      `*${user.name}*\n` +
      `Email: ${user.email}`
    ),
    context(`Signed up at ${formatDate(new Date())}`),
    actions([
      linkButton("View Profile", `${APP_URL}/admin/freelancers`),
    ]),
  ];
}

export function freelancerApplicationBlock(
  freelancer: SlackFreelancerInfo
): (Block | KnownBlock)[] {
  return [
    header("New Freelancer Application"),
    divider(),
    section(
      `*${freelancer.name}*\n` +
      `Email: ${freelancer.email}\n` +
      `Skills: ${freelancer.skills.slice(0, 5).join(", ") || "Not specified"}\n` +
      (freelancer.hourlyRate ? `Rate: $${freelancer.hourlyRate}/hr\n` : "") +
      (freelancer.portfolioUrls.length > 0
        ? `Portfolio: <${freelancer.portfolioUrls[0]}|View>`
        : "")
    ),
    context("Review and approve or reject this application"),
    divider(),
    actions(
      [
        button("Approve", "freelancer_approve", freelancer.userId, "primary"),
        button("Reject", "freelancer_reject", freelancer.userId, "danger"),
        linkButton("View Full Profile", `${APP_URL}/admin/freelancers`),
      ],
      `freelancer_action_${freelancer.userId}`
    ),
  ];
}

export function freelancerApprovedBlock(
  freelancer: SlackFreelancerInfo,
  approvedBy: string
): (Block | KnownBlock)[] {
  return [
    section(
      `:white_check_mark: *Freelancer Approved*\n` +
      `${freelancer.name} has been approved by ${approvedBy}`
    ),
    context(formatDate(new Date())),
  ];
}

export function freelancerRejectedBlock(
  freelancer: SlackFreelancerInfo,
  rejectedBy: string,
  reason?: string
): (Block | KnownBlock)[] {
  return [
    section(
      `:x: *Freelancer Rejected*\n` +
      `${freelancer.name} has been rejected by ${rejectedBy}` +
      (reason ? `\nReason: ${reason}` : "")
    ),
    context(formatDate(new Date())),
  ];
}

// ============================================
// Task Event Blocks
// ============================================

export function taskCreatedBlock(task: SlackTaskInfo): (Block | KnownBlock)[] {
  return [
    header("New Task Created"),
    divider(),
    section(
      `*${task.title}*\n` +
      `Client: ${task.clientName}\n` +
      `Category: ${task.category || "General"}\n` +
      `Credits: ${task.credits}\n` +
      (task.freelancerName ? `Assigned to: ${task.freelancerName}\n` : "") +
      (task.deadline ? `Deadline: ${formatDate(task.deadline)}` : "")
    ),
    context(`Created at ${formatDate(task.createdAt)}`),
    actions([
      linkButton("View Task", `${APP_URL}/admin/tasks/${task.id}`),
    ]),
  ];
}

export function taskAssignedBlock(
  task: SlackTaskInfo,
  freelancerName: string
): (Block | KnownBlock)[] {
  return [
    section(
      `:point_right: *Task Assigned*\n` +
      `*${task.title}*\n` +
      `Assigned to: ${freelancerName}\n` +
      `Client: ${task.clientName}`
    ),
    context(formatDate(new Date())),
    actions([
      linkButton("View Task (Admin)", `${APP_URL}/admin/tasks/${task.id}`),
      linkButton("View Task (Artist)", `${APP_URL}/portal/tasks/${task.id}`),
    ]),
  ];
}

export function taskStartedBlock(task: SlackTaskInfo): (Block | KnownBlock)[] {
  return [
    section(
      `:hammer_and_wrench: *Task Started*\n` +
      `*${task.title}*\n` +
      `Freelancer: ${task.freelancerName || "Unknown"}`
    ),
    context(formatDate(new Date())),
  ];
}

export function taskPendingReviewBlock(task: SlackTaskInfo): (Block | KnownBlock)[] {
  return [
    header("Deliverable Pending Review"),
    divider(),
    section(
      `*${task.title}*\n` +
      `Client: ${task.clientName}\n` +
      `Freelancer: ${task.freelancerName || "Unknown"}\n` +
      `Credits: ${task.credits}`
    ),
    context("This deliverable needs admin verification before client review"),
    divider(),
    actions(
      [
        button("Verify & Approve", "task_verify", task.id, "primary"),
        button("Request Changes", "task_request_changes", task.id, "danger"),
        linkButton("View Deliverables", `${APP_URL}/admin/tasks/${task.id}`),
      ],
      `task_review_${task.id}`
    ),
  ];
}

export function taskVerifiedBlock(
  task: SlackTaskInfo,
  verifiedBy: string
): (Block | KnownBlock)[] {
  return [
    section(
      `:white_check_mark: *Deliverable Verified*\n` +
      `*${task.title}*\n` +
      `Verified by ${verifiedBy} - now visible to client`
    ),
    context(formatDate(new Date())),
  ];
}

export function taskApprovedBlock(task: SlackTaskInfo): (Block | KnownBlock)[] {
  return [
    section(
      `:tada: *Task Approved by Client*\n` +
      `*${task.title}*\n` +
      `Client: ${task.clientName}\n` +
      `Freelancer: ${task.freelancerName || "Unknown"}`
    ),
    context(formatDate(new Date())),
  ];
}

export function taskCompletedBlock(task: SlackTaskInfo): (Block | KnownBlock)[] {
  return [
    section(
      `:white_check_mark: *Task Completed*\n` +
      `*${task.title}*\n` +
      `Client: ${task.clientName}\n` +
      `Freelancer: ${task.freelancerName || "Unknown"}\n` +
      `Credits: ${task.credits}`
    ),
    context(formatDate(new Date())),
  ];
}

export function revisionRequestedBlock(
  task: SlackTaskInfo,
  feedback: string
): (Block | KnownBlock)[] {
  return [
    section(
      `:arrows_counterclockwise: *Revision Requested*\n` +
      `*${task.title}*\n` +
      `Client: ${task.clientName}\n` +
      `Freelancer: ${task.freelancerName || "Unknown"}`
    ),
    divider(),
    section(`*Feedback:*\n${feedback.slice(0, 500)}${feedback.length > 500 ? "..." : ""}`),
    context(formatDate(new Date())),
    actions([
      linkButton("View Task", `${APP_URL}/admin/tasks/${task.id}`),
    ]),
  ];
}

export function taskCancelledBlock(
  task: SlackTaskInfo,
  reason?: string
): (Block | KnownBlock)[] {
  return [
    section(
      `:no_entry: *Task Cancelled*\n` +
      `*${task.title}*\n` +
      `Client: ${task.clientName}` +
      (reason ? `\nReason: ${reason}` : "")
    ),
    context(formatDate(new Date())),
  ];
}

// ============================================
// Credit Event Blocks
// ============================================

export function creditPurchaseBlock(
  purchase: SlackCreditPurchaseInfo
): (Block | KnownBlock)[] {
  return [
    section(
      `:moneybag: *Credit Purchase*\n` +
      `User: ${purchase.userName} (${purchase.userEmail})\n` +
      `Amount: $${purchase.amount.toFixed(2)}\n` +
      `Credits: +${purchase.credits}\n` +
      `New Balance: ${purchase.newBalance} credits`
    ),
    context(formatDate(new Date())),
  ];
}

export function lowCreditsBlock(
  userName: string,
  email: string,
  remainingCredits: number
): (Block | KnownBlock)[] {
  return [
    section(
      `:warning: *Low Credits Alert*\n` +
      `User: ${userName} (${email})\n` +
      `Remaining: ${remainingCredits} credits`
    ),
    context(formatDate(new Date())),
  ];
}

// ============================================
// Client Channel Blocks
// ============================================

export function clientChannelWelcomeBlock(
  company: SlackCompanyInfo
): (Block | KnownBlock)[] {
  return [
    header(`Welcome to ${company.name}'s Channel`),
    divider(),
    section(
      `This channel is for all tasks and deliverables related to *${company.name}*.\n\n` +
      `Assigned artists will be added here automatically and can:\n` +
      `• View task updates and deliverables\n` +
      `• Discuss requirements and feedback\n` +
      `• Share progress and files`
    ),
    context(`Channel created on ${formatDate(new Date())}`),
  ];
}

export function artistAddedToChannelBlock(
  artistName: string,
  taskTitle: string
): (Block | KnownBlock)[] {
  return [
    section(
      `:wave: *${artistName}* has been added to this channel\n` +
      `Assigned to: ${taskTitle}`
    ),
  ];
}

export function clientTaskUpdateBlock(
  task: SlackTaskInfo,
  updateType: "created" | "submitted" | "approved" | "revision" | "completed"
): (Block | KnownBlock)[] {
  const emoji = {
    created: ":new:",
    submitted: ":inbox_tray:",
    approved: ":white_check_mark:",
    revision: ":arrows_counterclockwise:",
    completed: ":tada:",
  };

  const title = {
    created: "New Task Created",
    submitted: "Deliverable Submitted",
    approved: "Task Approved",
    revision: "Revision Requested",
    completed: "Task Completed",
  };

  return [
    section(
      `${emoji[updateType]} *${title[updateType]}*\n` +
      `*${task.title}*\n` +
      (task.freelancerName ? `Artist: ${task.freelancerName}` : "")
    ),
    context(formatDate(new Date())),
    actions([
      linkButton("View Details", `${APP_URL}/tasks/${task.id}`),
    ]),
  ];
}

// ============================================
// System Event Blocks
// ============================================

export function systemErrorBlock(
  error: string,
  context_info?: string
): (Block | KnownBlock)[] {
  return [
    section(
      `:rotating_light: *System Error*\n` +
      `\`\`\`${error.slice(0, 1000)}\`\`\`` +
      (context_info ? `\nContext: ${context_info}` : "")
    ),
    context(formatDate(new Date())),
  ];
}

export function securityAlertBlock(
  alertType: string,
  details: string
): (Block | KnownBlock)[] {
  return [
    header("Security Alert"),
    divider(),
    section(
      `:shield: *${alertType}*\n` +
      details.slice(0, 1000)
    ),
    context(formatDate(new Date())),
  ];
}

// ============================================
// Modal Views
// ============================================

export function rejectFreelancerModal(
  freelancerId: string,
  freelancerName: string
): object {
  return {
    type: "modal",
    callback_id: "reject_freelancer_modal",
    private_metadata: freelancerId,
    title: {
      type: "plain_text",
      text: "Reject Application",
    },
    submit: {
      type: "plain_text",
      text: "Reject",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      section(`Rejecting application from *${freelancerName}*`),
      {
        type: "input",
        block_id: "rejection_reason",
        element: {
          type: "plain_text_input",
          action_id: "reason_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Enter rejection reason (optional)...",
          },
        },
        label: {
          type: "plain_text",
          text: "Rejection Reason",
        },
        optional: true,
      },
    ],
  };
}

export function requestTaskChangesModal(
  taskId: string,
  taskTitle: string
): object {
  return {
    type: "modal",
    callback_id: "request_task_changes_modal",
    private_metadata: taskId,
    title: {
      type: "plain_text",
      text: "Request Changes",
    },
    submit: {
      type: "plain_text",
      text: "Send Feedback",
    },
    close: {
      type: "plain_text",
      text: "Cancel",
    },
    blocks: [
      section(`Requesting changes for *${taskTitle}*`),
      {
        type: "input",
        block_id: "change_feedback",
        element: {
          type: "plain_text_input",
          action_id: "feedback_input",
          multiline: true,
          placeholder: {
            type: "plain_text",
            text: "Describe what changes are needed...",
          },
        },
        label: {
          type: "plain_text",
          text: "Feedback",
        },
      },
    ],
  };
}
