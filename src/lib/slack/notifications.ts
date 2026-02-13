/**
 * Slack Notifications
 * Routes events to appropriate Slack channels
 */

import {
  postMessage,
  getChannelConfig,
  isSlackConfigured,
  sendDM,
  lookupUserByEmail,
} from './client'
import { getOrCreateClientChannel, addArtistToClientChannel } from './channels'
import * as blocks from './blocks'
import type {
  SlackEventType as SlackEventTypeValue,
  SlackUserInfo,
  SlackTaskInfo,
  SlackFreelancerInfo,
  SlackCreditPurchaseInfo,
  SlackCompanyInfo,
  SlackNotificationResult,
} from './types'
import { logger } from '@/lib/logger'

type SlackEventType = SlackEventTypeValue

/**
 * Main notification dispatcher
 */
export async function notifySlack(
  event: SlackEventType,
  data: Record<string, unknown>
): Promise<SlackNotificationResult> {
  if (!isSlackConfigured()) {
    logger.debug('[Slack] Not configured, skipping notification')
    return { success: false, error: 'Slack not configured' }
  }

  const channels = getChannelConfig()

  try {
    switch (event) {
      // User events
      case 'NEW_CLIENT_SIGNUP':
        return notifyNewClientSignup(
          data.user as SlackUserInfo,
          data.company as SlackCompanyInfo | undefined,
          channels.newSignups
        )

      case 'NEW_FREELANCER_SIGNUP':
        return notifyNewFreelancerSignup(data.user as SlackUserInfo, channels.newSignups)

      case 'FREELANCER_APPLICATION':
        return notifyFreelancerApplication(
          data.freelancer as SlackFreelancerInfo,
          channels.freelancerApps
        )

      case 'FREELANCER_APPROVED':
        return notifyFreelancerApproved(
          data.freelancer as SlackFreelancerInfo,
          data.approvedBy as string,
          channels.freelancerApps
        )

      case 'FREELANCER_REJECTED':
        return notifyFreelancerRejected(
          data.freelancer as SlackFreelancerInfo,
          data.rejectedBy as string,
          data.reason as string | undefined,
          channels.freelancerApps
        )

      // Task events
      case 'TASK_CREATED':
        return notifyTaskCreated(
          data.task as SlackTaskInfo,
          data.company as SlackCompanyInfo | undefined,
          channels.allTasks
        )

      case 'TASK_ASSIGNED':
        return notifyTaskAssigned(
          data.task as SlackTaskInfo,
          data.company as SlackCompanyInfo | undefined,
          data.freelancerName as string,
          channels.allTasks
        )

      case 'TASK_STARTED':
        return notifyTaskStarted(data.task as SlackTaskInfo, channels.allTasks)

      case 'TASK_PENDING_REVIEW':
        return notifyTaskPendingReview(data.task as SlackTaskInfo, channels.pendingReviews)

      case 'TASK_APPROVED':
        return notifyTaskApproved(
          data.task as SlackTaskInfo,
          data.company as SlackCompanyInfo | undefined,
          channels.allTasks
        )

      case 'TASK_COMPLETED':
        return notifyTaskCompleted(
          data.task as SlackTaskInfo,
          data.company as SlackCompanyInfo | undefined,
          channels.allTasks
        )

      case 'REVISION_REQUESTED':
        return notifyRevisionRequested(
          data.task as SlackTaskInfo,
          data.feedback as string,
          data.company as SlackCompanyInfo | undefined,
          channels.allTasks
        )

      case 'TASK_CANCELLED':
        return notifyTaskCancelled(
          data.task as SlackTaskInfo,
          data.reason as string | undefined,
          channels.allTasks
        )

      // Credit events
      case 'CREDIT_PURCHASE':
        return notifyCreditPurchase(
          data.purchase as SlackCreditPurchaseInfo,
          channels.creditPurchases
        )

      case 'LOW_CREDITS':
        return notifyLowCredits(
          data.userName as string,
          data.email as string,
          data.remainingCredits as number,
          channels.superadminAlerts
        )

      // System events
      case 'SYSTEM_ERROR':
        return notifySystemError(
          data.error as string,
          data.context as string | undefined,
          channels.superadminAlerts
        )

      case 'SECURITY_ALERT':
        return notifySecurityAlert(
          data.alertType as string,
          data.details as string,
          channels.superadminAlerts
        )

      default:
        logger.warn({ event }, '[Slack] Unknown event type')
        return { success: false, error: `Unknown event type: ${event}` }
    }
  } catch (error) {
    logger.error({ err: error, event }, '[Slack] Failed to send notification')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

// ============================================
// User Event Handlers
// ============================================

async function notifyNewClientSignup(
  user: SlackUserInfo,
  company: SlackCompanyInfo | undefined,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured for new signups' }
  }

  return postMessage(
    channelId,
    blocks.newClientSignupBlock(user, company),
    `New client signup: ${user.name} (${user.email})`
  )
}

async function notifyNewFreelancerSignup(
  user: SlackUserInfo,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured for new signups' }
  }

  return postMessage(
    channelId,
    blocks.newFreelancerSignupBlock(user),
    `New freelancer signup: ${user.name} (${user.email})`
  )
}

async function notifyFreelancerApplication(
  freelancer: SlackFreelancerInfo,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured for freelancer apps' }
  }

  return postMessage(
    channelId,
    blocks.freelancerApplicationBlock(freelancer),
    `New freelancer application from ${freelancer.name}`
  )
}

async function notifyFreelancerApproved(
  freelancer: SlackFreelancerInfo,
  approvedBy: string,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured' }
  }

  // Also send DM to freelancer if they're in Slack
  const slackUser = await lookupUserByEmail(freelancer.email)
  if (slackUser.success && slackUser.userId) {
    await sendDM(
      slackUser.userId,
      [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `:tada: *Congratulations!* Your freelancer application has been approved.\n\nYou can now receive task assignments. Check the dashboard for available tasks.`,
          },
        },
      ],
      'Your freelancer application has been approved!'
    )
  }

  return postMessage(
    channelId,
    blocks.freelancerApprovedBlock(freelancer, approvedBy),
    `Freelancer ${freelancer.name} approved by ${approvedBy}`
  )
}

async function notifyFreelancerRejected(
  freelancer: SlackFreelancerInfo,
  rejectedBy: string,
  reason: string | undefined,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured' }
  }

  return postMessage(
    channelId,
    blocks.freelancerRejectedBlock(freelancer, rejectedBy, reason),
    `Freelancer ${freelancer.name} rejected by ${rejectedBy}`
  )
}

// ============================================
// Task Event Handlers
// ============================================

async function notifyTaskCreated(
  task: SlackTaskInfo,
  company: SlackCompanyInfo | undefined,
  channelId: string
): Promise<SlackNotificationResult> {
  const results: SlackNotificationResult[] = []

  // Post to all-tasks channel
  if (channelId) {
    const result = await postMessage(
      channelId,
      blocks.taskCreatedBlock(task),
      `New task created: ${task.title}`
    )
    results.push(result)
  }

  // Post to client channel if exists
  if (company?.id) {
    const clientChannel = await getOrCreateClientChannel(company.id)
    if (clientChannel.success && clientChannel.channelId) {
      await postMessage(
        clientChannel.channelId,
        blocks.clientTaskUpdateBlock(task, 'created'),
        `New task created: ${task.title}`
      )
    }
  }

  return results[0] || { success: false, error: 'No channels configured' }
}

async function notifyTaskAssigned(
  task: SlackTaskInfo,
  company: SlackCompanyInfo | undefined,
  freelancerName: string,
  channelId: string
): Promise<SlackNotificationResult> {
  const results: SlackNotificationResult[] = []

  // Post to all-tasks channel
  if (channelId) {
    const result = await postMessage(
      channelId,
      blocks.taskAssignedBlock(task, freelancerName),
      `Task assigned: ${task.title} to ${freelancerName}`
    )
    results.push(result)
  }

  // Add artist to client channel
  if (company?.id && task.freelancerEmail) {
    // Find freelancer user ID
    const { db } = await import('@/db')
    const { users } = await import('@/db/schema')
    const { eq } = await import('drizzle-orm')

    const freelancer = await db.query.users.findFirst({
      where: eq(users.email, task.freelancerEmail),
    })

    if (freelancer) {
      await addArtistToClientChannel(company.id, freelancer.id, task.title)
    }
  }

  // Send DM to freelancer
  if (task.freelancerEmail) {
    const slackUser = await lookupUserByEmail(task.freelancerEmail)
    if (slackUser.success && slackUser.userId) {
      await sendDM(
        slackUser.userId,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:point_right: *New Task Assigned*\n\n*${task.title}*\nClient: ${task.clientName}\nCredits: ${task.credits}${task.deadline ? `\nDeadline: ${new Date(task.deadline).toLocaleDateString()}` : ''}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Task' },
                url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/tasks/${task.id}`,
              },
            ],
          },
        ],
        `New task assigned: ${task.title}`
      )
    }
  }

  return results[0] || { success: false, error: 'No channels configured' }
}

async function notifyTaskStarted(
  task: SlackTaskInfo,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured' }
  }

  return postMessage(channelId, blocks.taskStartedBlock(task), `Task started: ${task.title}`)
}

async function notifyTaskPendingReview(
  task: SlackTaskInfo,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured for pending reviews' }
  }

  return postMessage(
    channelId,
    blocks.taskPendingReviewBlock(task),
    `Deliverable pending admin review: ${task.title}`
  )
}

async function notifyTaskApproved(
  task: SlackTaskInfo,
  company: SlackCompanyInfo | undefined,
  channelId: string
): Promise<SlackNotificationResult> {
  const results: SlackNotificationResult[] = []

  if (channelId) {
    const result = await postMessage(
      channelId,
      blocks.taskApprovedBlock(task),
      `Task approved: ${task.title}`
    )
    results.push(result)
  }

  // Post to client channel
  if (company?.id) {
    const clientChannel = await getOrCreateClientChannel(company.id)
    if (clientChannel.success && clientChannel.channelId) {
      await postMessage(
        clientChannel.channelId,
        blocks.clientTaskUpdateBlock(task, 'approved'),
        `Task approved: ${task.title}`
      )
    }
  }

  return results[0] || { success: false, error: 'No channels configured' }
}

async function notifyTaskCompleted(
  task: SlackTaskInfo,
  company: SlackCompanyInfo | undefined,
  channelId: string
): Promise<SlackNotificationResult> {
  const results: SlackNotificationResult[] = []

  if (channelId) {
    const result = await postMessage(
      channelId,
      blocks.taskCompletedBlock(task),
      `Task completed: ${task.title}`
    )
    results.push(result)
  }

  // Post to client channel
  if (company?.id) {
    const clientChannel = await getOrCreateClientChannel(company.id)
    if (clientChannel.success && clientChannel.channelId) {
      await postMessage(
        clientChannel.channelId,
        blocks.clientTaskUpdateBlock(task, 'completed'),
        `Task completed: ${task.title}`
      )
    }
  }

  // Send DM to freelancer
  if (task.freelancerEmail) {
    const slackUser = await lookupUserByEmail(task.freelancerEmail)
    if (slackUser.success && slackUser.userId) {
      await sendDM(
        slackUser.userId,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:white_check_mark: *Task Completed*\n\n*${task.title}*\nClient: ${task.clientName}\n\nGreat work! :tada:`,
            },
          },
        ],
        `Task completed: ${task.title}`
      )
    }
  }

  return results[0] || { success: false, error: 'No channels configured' }
}

async function notifyRevisionRequested(
  task: SlackTaskInfo,
  feedback: string,
  company: SlackCompanyInfo | undefined,
  channelId: string
): Promise<SlackNotificationResult> {
  const results: SlackNotificationResult[] = []

  if (channelId) {
    const result = await postMessage(
      channelId,
      blocks.revisionRequestedBlock(task, feedback),
      `Revision requested: ${task.title}`
    )
    results.push(result)
  }

  // Post to client channel
  if (company?.id) {
    const clientChannel = await getOrCreateClientChannel(company.id)
    if (clientChannel.success && clientChannel.channelId) {
      await postMessage(
        clientChannel.channelId,
        blocks.clientTaskUpdateBlock(task, 'revision'),
        `Revision requested: ${task.title}`
      )
    }
  }

  // Send DM to freelancer
  if (task.freelancerEmail) {
    const slackUser = await lookupUserByEmail(task.freelancerEmail)
    if (slackUser.success && slackUser.userId) {
      await sendDM(
        slackUser.userId,
        [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `:arrows_counterclockwise: *Revision Requested*\n\n*${task.title}*\n\n*Feedback:*\n${feedback.slice(0, 500)}`,
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'View Task' },
                url: `${process.env.NEXT_PUBLIC_APP_URL}/portal/tasks/${task.id}`,
              },
            ],
          },
        ],
        `Revision requested: ${task.title}`
      )
    }
  }

  return results[0] || { success: false, error: 'No channels configured' }
}

async function notifyTaskCancelled(
  task: SlackTaskInfo,
  reason: string | undefined,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured' }
  }

  return postMessage(
    channelId,
    blocks.taskCancelledBlock(task, reason),
    `Task cancelled: ${task.title}`
  )
}

// ============================================
// Credit Event Handlers
// ============================================

async function notifyCreditPurchase(
  purchase: SlackCreditPurchaseInfo,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured for credit purchases' }
  }

  return postMessage(
    channelId,
    blocks.creditPurchaseBlock(purchase),
    `Credit purchase: ${purchase.userName} bought ${purchase.credits} credits`
  )
}

async function notifyLowCredits(
  userName: string,
  email: string,
  remainingCredits: number,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured' }
  }

  return postMessage(
    channelId,
    blocks.lowCreditsBlock(userName, email, remainingCredits),
    `Low credits alert: ${userName} has ${remainingCredits} credits remaining`
  )
}

// ============================================
// System Event Handlers
// ============================================

async function notifySystemError(
  error: string,
  context: string | undefined,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured' }
  }

  return postMessage(
    channelId,
    blocks.systemErrorBlock(error, context),
    `System error: ${error.slice(0, 100)}`
  )
}

async function notifySecurityAlert(
  alertType: string,
  details: string,
  channelId: string
): Promise<SlackNotificationResult> {
  if (!channelId) {
    return { success: false, error: 'No channel configured' }
  }

  return postMessage(
    channelId,
    blocks.securityAlertBlock(alertType, details),
    `Security alert: ${alertType}`
  )
}
