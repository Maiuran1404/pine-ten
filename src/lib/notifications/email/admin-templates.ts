import { config } from '@/lib/config'
import { notifySlack, SlackEventType } from '@/lib/slack'
import { logger } from '@/lib/logger'
import { heading, paragraph, button, infoCard, callout, spacer, statusBadge } from './components'
import { wrapUserEmail } from './layout'
import { colors } from './constants'

// Import sendEmail & notifyAdmin lazily to avoid circular dependency.
// These are used at runtime, not at import time.
async function getSendEmail() {
  const { sendEmail } = await import('../email')
  return sendEmail
}

async function getNotifyAdmin() {
  const { notifyAdmin } = await import('../email')
  return notifyAdmin
}

export const adminNotifications = {
  newClientSignup: async (data: {
    name: string
    email: string
    userId?: string
    company?: { name: string; industry?: string }
  }) => {
    notifySlack(SlackEventType.NEW_CLIENT_SIGNUP, {
      user: {
        id: data.userId || '',
        name: data.name,
        email: data.email,
      },
      company: data.company,
    }).catch((err) =>
      logger.error({ err }, 'Failed to send Slack notification for new client signup')
    )

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'New Client Signup',
      `
        ${heading('New Client Registered', { color: colors.primary })}
        ${infoCard([
          { label: 'Name', value: `<strong>${data.name}</strong>` },
          { label: 'Email', value: data.email },
          { label: 'Time', value: new Date().toLocaleString() },
        ])}
        ${button('View Clients', `${config.app.url}/admin/clients`)}
      `
    )
  },

  newFreelancerApplication: async (data: {
    name: string
    email: string
    skills: string[]
    portfolioUrls: string[]
    userId?: string
    hourlyRate?: number
  }) => {
    notifySlack(SlackEventType.FREELANCER_APPLICATION, {
      freelancer: {
        userId: data.userId || '',
        name: data.name,
        email: data.email,
        skills: data.skills,
        portfolioUrls: data.portfolioUrls,
        hourlyRate: data.hourlyRate,
      },
    }).catch((err) =>
      logger.error({ err }, 'Failed to send Slack notification for freelancer application')
    )

    const portfolioHtml =
      data.portfolioUrls.length > 0
        ? data.portfolioUrls
            .map((url) => `<a href="${url}" style="color:${colors.primary};">${url}</a>`)
            .join('<br/>')
        : 'Not provided'

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'New Freelancer Application',
      `
        ${heading('New Freelancer Application', { color: colors.info })}
        ${callout('A new freelancer has applied and requires your approval.', 'warning')}
        ${infoCard([
          { label: 'Name', value: `<strong>${data.name}</strong>` },
          { label: 'Email', value: data.email },
          {
            label: 'Skills',
            value: data.skills.join(', ') || 'Not specified',
          },
          { label: 'Portfolio', value: portfolioHtml },
        ])}
        ${button('Review Application', `${config.app.url}/admin/freelancers`)}
      `
    )
  },

  newTaskCreated: async (data: {
    taskId: string
    taskTitle: string
    clientName: string
    clientEmail: string
    category: string
    creditsUsed: number
    deadline?: Date
    companyId?: string
  }) => {
    notifySlack(SlackEventType.TASK_CREATED, {
      task: {
        id: data.taskId,
        title: data.taskTitle,
        clientName: data.clientName,
        category: data.category,
        credits: data.creditsUsed,
        deadline: data.deadline,
        createdAt: new Date(),
      },
      companyId: data.companyId,
    }).catch((err) => logger.error({ err }, 'Failed to send Slack notification for task created'))

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'New Task Created',
      `
        ${heading('New Task Submitted', { color: colors.primary })}
        ${infoCard([
          { label: 'Task Title', value: `<strong>${data.taskTitle}</strong>` },
          {
            label: 'Client',
            value: `${data.clientName} (${data.clientEmail})`,
          },
          { label: 'Category', value: data.category },
          {
            label: 'Credits',
            value: `${data.creditsUsed} credits ($${data.creditsUsed * config.credits.pricePerCredit})`,
          },
        ])}
        ${button('View Tasks', `${config.app.url}/admin/tasks`)}
      `
    )
  },

  taskAssigned: async (data: {
    taskId: string
    taskTitle: string
    freelancerName: string
    freelancerEmail: string
    freelancerUserId?: string
    clientName: string
    companyId?: string
    credits?: number
  }) => {
    notifySlack(SlackEventType.TASK_ASSIGNED, {
      task: {
        id: data.taskId,
        title: data.taskTitle,
        clientName: data.clientName,
        freelancerName: data.freelancerName,
        credits: data.credits || 0,
        createdAt: new Date(),
      },
      freelancerName: data.freelancerName,
      freelancerUserId: data.freelancerUserId,
      companyId: data.companyId,
    }).catch((err) => logger.error({ err }, 'Failed to send Slack notification for task assigned'))

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'Task Assigned',
      `
        ${heading('Task Assigned to Freelancer', { color: colors.info })}
        ${infoCard([
          { label: 'Task', value: `<strong>${data.taskTitle}</strong>` },
          {
            label: 'Freelancer',
            value: `${data.freelancerName} (${data.freelancerEmail})`,
          },
          { label: 'Client', value: data.clientName },
        ])}
      `
    )
  },

  taskCompleted: async (data: {
    taskId: string
    taskTitle: string
    freelancerName: string
    clientName: string
    credits?: number
    companyId?: string
  }) => {
    notifySlack(SlackEventType.TASK_COMPLETED, {
      task: {
        id: data.taskId,
        title: data.taskTitle,
        clientName: data.clientName,
        freelancerName: data.freelancerName,
        credits: data.credits || 0,
        createdAt: new Date(),
      },
      companyId: data.companyId,
    }).catch((err) => logger.error({ err }, 'Failed to send Slack notification for task completed'))

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'Task Completed',
      `
        ${heading('Task Completed', { color: colors.primary })}
        ${infoCard([
          { label: 'Task', value: `<strong>${data.taskTitle}</strong>` },
          { label: 'Completed by', value: data.freelancerName },
          { label: 'Client', value: data.clientName },
        ])}
        ${statusBadge('Completed', 'success')}
      `
    )
  },

  creditPurchase: async (data: {
    clientName: string
    clientEmail: string
    credits: number
    amount: number
    paymentId?: string
    newBalance?: number
  }) => {
    notifySlack(SlackEventType.CREDIT_PURCHASE, {
      purchase: {
        userName: data.clientName,
        userEmail: data.clientEmail,
        credits: data.credits,
        amount: data.amount,
        newBalance: data.newBalance || data.credits,
      },
    }).catch((err) =>
      logger.error({ err }, 'Failed to send Slack notification for credit purchase')
    )

    const rows = [
      { label: 'Client', value: `<strong>${data.clientName}</strong>` },
      { label: 'Email', value: data.clientEmail },
      { label: 'Credits', value: `${data.credits} credits` },
      {
        label: 'Amount',
        value: `<strong style="color:${colors.primary};">$${data.amount.toFixed(2)}</strong>`,
      },
    ]
    if (data.paymentId) {
      rows.push({
        label: 'Payment ID',
        value: `<code style="font-size:12px;">${data.paymentId}</code>`,
      })
    }

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'Credit Purchase',
      `
        ${heading('New Credit Purchase', { color: colors.primary })}
        ${infoCard(rows)}
      `
    )
  },

  freelancerApproved: async (data: {
    name: string
    email: string
    approvedBy?: string
    userId?: string
    skills?: string[]
    portfolioUrls?: string[]
  }) => {
    notifySlack(SlackEventType.FREELANCER_APPROVED, {
      freelancer: {
        userId: data.userId || '',
        name: data.name,
        email: data.email,
        skills: data.skills || [],
        portfolioUrls: data.portfolioUrls || [],
      },
      approvedBy: data.approvedBy || 'Admin',
    }).catch((err) =>
      logger.error({ err }, 'Failed to send Slack notification for freelancer approved')
    )

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'Freelancer Approved',
      `
        ${heading('Freelancer Approved', { color: colors.primary })}
        ${infoCard([
          { label: 'Freelancer', value: `<strong>${data.name}</strong>` },
          { label: 'Email', value: data.email },
          { label: 'Status', value: statusBadge('Approved', 'success') },
        ])}
      `
    )
  },

  freelancerRejected: async (data: {
    name: string
    email: string
    rejectedBy?: string
    reason?: string
    userId?: string
  }) => {
    notifySlack(SlackEventType.FREELANCER_REJECTED, {
      freelancer: {
        userId: data.userId || '',
        name: data.name,
        email: data.email,
        skills: [],
        portfolioUrls: [],
      },
      rejectedBy: data.rejectedBy || 'Admin',
      reason: data.reason,
    }).catch((err) =>
      logger.error({ err }, 'Failed to send Slack notification for freelancer rejected')
    )

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'Freelancer Rejected',
      `
        ${heading('Freelancer Rejected', { color: colors.error })}
        ${infoCard([
          { label: 'Freelancer', value: `<strong>${data.name}</strong>` },
          { label: 'Email', value: data.email },
          { label: 'Status', value: statusBadge('Rejected', 'error') },
        ])}
      `
    )
  },

  revisionRequested: async (data: {
    taskId: string
    taskTitle: string
    clientName: string
    freelancerName: string
    revisionsUsed: number
    maxRevisions: number
    feedback?: string
    companyId?: string
  }) => {
    notifySlack(SlackEventType.REVISION_REQUESTED, {
      task: {
        id: data.taskId,
        title: data.taskTitle,
        clientName: data.clientName,
        freelancerName: data.freelancerName,
        credits: 0,
        createdAt: new Date(),
      },
      feedback: data.feedback || '',
      companyId: data.companyId,
    }).catch((err) =>
      logger.error({ err }, 'Failed to send Slack notification for revision requested')
    )

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'Revision Requested',
      `
        ${heading('Revision Requested', { color: colors.warning })}
        ${infoCard([
          { label: 'Task', value: `<strong>${data.taskTitle}</strong>` },
          { label: 'Client', value: data.clientName },
          { label: 'Freelancer', value: data.freelancerName },
          {
            label: 'Revisions',
            value: `${data.revisionsUsed} / ${data.maxRevisions}`,
          },
        ])}
      `
    )
  },

  deliverablePendingReview: async (data: {
    taskId: string
    taskTitle: string
    freelancerName: string
    freelancerEmail: string
    clientName: string
    clientEmail: string
    fileCount: number
    credits?: number
  }) => {
    notifySlack(SlackEventType.TASK_PENDING_REVIEW, {
      task: {
        id: data.taskId,
        title: data.taskTitle,
        clientName: data.clientName,
        freelancerName: data.freelancerName,
        credits: data.credits || 0,
        createdAt: new Date(),
      },
    }).catch((err) => logger.error({ err }, 'Failed to send Slack notification for pending review'))

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'ACTION REQUIRED: Deliverable Needs Verification',
      `
        ${heading('Deliverable Pending Verification', { color: colors.error })}
        ${callout('A freelancer has submitted deliverables that require your verification before the client can review them.', 'warning', { title: 'Action Required' })}
        ${infoCard([
          { label: 'Task', value: `<strong>${data.taskTitle}</strong>` },
          {
            label: 'Freelancer',
            value: `${data.freelancerName} (${data.freelancerEmail})`,
          },
          {
            label: 'Client',
            value: `${data.clientName} (${data.clientEmail})`,
          },
          {
            label: 'Files',
            value: `${data.fileCount} file${data.fileCount !== 1 ? 's' : ''}`,
          },
        ])}
        ${button('Review & Verify Deliverable', `${config.app.url}/admin/verify/${data.taskId}`, { variant: 'danger' })}
        ${spacer(8)}
        ${paragraph('The client will not see the deliverables until you verify them. Please review the work quality before approving.', { muted: true, size: 'sm' })}
      `
    )
  },

  deliverableVerified: async (data: {
    taskTitle: string
    clientName: string
    clientEmail: string
    freelancerName: string
    taskUrl: string
  }) => {
    // This template sends to the CLIENT, not admin, so uses user layout
    const sendEmail = await getSendEmail()
    return sendEmail({
      to: data.clientEmail,
      subject: `Deliverable Ready for Review: ${data.taskTitle}`,
      html: wrapUserEmail(`
        ${heading('Your Deliverable is Ready!', { color: colors.primary })}
        ${paragraph(`Hi ${data.clientName},`)}
        ${paragraph(`<strong>${data.freelancerName}</strong> has completed work on <strong>${data.taskTitle}</strong>.`)}
        ${callout('The deliverable has been verified by our team and is now ready for your review.', 'success')}
        ${button('Review Deliverable', data.taskUrl)}
        ${spacer(8)}
        ${paragraph(`&mdash; The ${config.app.name} Team`, { muted: true })}
      `),
    })
  },

  taskUnassignable: async (data: {
    taskId: string
    taskTitle: string
    reason: string
    escalationLevel: number
  }) => {
    notifySlack(SlackEventType.TASK_PENDING_REVIEW, {
      task: {
        id: data.taskId,
        title: data.taskTitle,
        clientName: 'Unknown',
        freelancerName: 'UNASSIGNED',
        credits: 0,
        createdAt: new Date(),
      },
    }).catch((err) =>
      logger.error({ err }, 'Failed to send Slack notification for unassignable task')
    )

    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'URGENT: Task Could Not Be Assigned',
      `
        ${heading('Task Assignment Failed', { color: colors.error })}
        ${callout('This task could not be automatically assigned to any artist and requires your manual intervention.', 'error', { title: 'Urgent' })}
        ${infoCard([
          { label: 'Task', value: `<strong>${data.taskTitle}</strong>` },
          { label: 'Reason', value: data.reason },
          { label: 'Escalation', value: `Level ${data.escalationLevel}` },
        ])}
        ${button('Manually Assign Task', `${config.app.url}/admin/tasks/${data.taskId}`, { variant: 'danger' })}
      `
    )
  },

  taskOfferSent: async (data: {
    taskId: string
    taskTitle: string
    artistName: string
    artistEmail: string
    matchScore: number
    expiresInMinutes: number
  }) => {
    const notifyAdmin = await getNotifyAdmin()
    return notifyAdmin(
      'Task Offer Sent',
      `
        ${heading('Task Offer Sent to Artist', { color: colors.info })}
        ${infoCard([
          { label: 'Task', value: `<strong>${data.taskTitle}</strong>` },
          {
            label: 'Offered to',
            value: `${data.artistName} (${data.artistEmail})`,
          },
          {
            label: 'Match Score',
            value: `${data.matchScore.toFixed(1)}%`,
          },
          {
            label: 'Expires in',
            value: `${data.expiresInMinutes} minutes`,
          },
        ])}
      `
    )
  },
}
