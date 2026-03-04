import 'server-only'
import { Resend } from 'resend'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { wrapAdminEmail } from './email/layout'
import { queueEmail, registerSenders, type QueuedEmail } from './email-queue'

// Re-export templates from modular files
export { emailTemplates } from './email/user-templates'
export { adminNotifications } from './email/admin-templates'

// Lazy initialization to avoid errors during build when env vars aren't available
let resendInstance: Resend | null = null

function getResend(): Resend {
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY)
  }
  return resendInstance
}

// ---------------------------------------------------------------------------
// Raw sender — direct Resend API call (used by queue drain)
// ---------------------------------------------------------------------------

interface EmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

async function sendEmailRaw({ to, subject, html, text }: EmailParams): Promise<{
  success: boolean
  error?: unknown
}> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.error('RESEND_API_KEY is not set')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    // BCC admin on all emails for monitoring (if admin email is set)
    const adminEmail = config.notifications.email.adminEmail
    const bcc = adminEmail && to !== adminEmail ? adminEmail : undefined

    const { data, error } = await getResend().emails.send({
      from: config.notifications.email.from,
      to,
      bcc,
      subject,
      html,
      text,
    })

    if (error) {
      logger.error({ err: error, to, subject }, 'Email send failed')
      return { success: false, error }
    }

    logger.info({ emailId: data?.id, to }, 'Email sent successfully')
    return { success: true }
  } catch (error) {
    logger.error({ err: error, to, subject }, 'Email exception')
    return { success: false, error }
  }
}

// ---------------------------------------------------------------------------
// Batch sender — Resend batch API (multiple emails in 1 API call)
// ---------------------------------------------------------------------------

async function sendEmailBatch(
  emails: Array<{ to: string; subject: string; html: string; text?: string }>
): Promise<{ success: boolean; error?: unknown }> {
  try {
    if (!process.env.RESEND_API_KEY) {
      logger.error('RESEND_API_KEY is not set')
      return { success: false, error: 'RESEND_API_KEY not configured' }
    }

    const adminEmail = config.notifications.email.adminEmail
    const from = config.notifications.email.from

    const payload = emails.map((e) => ({
      from,
      to: e.to,
      bcc: adminEmail && e.to !== adminEmail ? adminEmail : undefined,
      subject: e.subject,
      html: e.html,
      text: e.text,
    }))

    const { data, error } = await getResend().batch.send(payload)

    if (error) {
      logger.error({ err: error, count: emails.length }, 'Batch email send failed')
      return { success: false, error }
    }

    logger.info({ count: emails.length, ids: data?.data?.map((d) => d.id) }, 'Batch email sent')
    return { success: true }
  } catch (error) {
    logger.error({ err: error, count: emails.length }, 'Batch email exception')
    return { success: false, error }
  }
}

// ---------------------------------------------------------------------------
// Register senders with the queue (breaks circular dependency)
// ---------------------------------------------------------------------------

registerSenders(sendEmailRaw, sendEmailBatch)

// ---------------------------------------------------------------------------
// Public API — sendEmail now routes through the queue
// ---------------------------------------------------------------------------

interface SendEmailParams extends EmailParams {
  /** User ID for per-user rate limiting */
  userId?: string
  /** 'high' bypasses queue for auth-critical emails */
  priority?: 'normal' | 'high'
}

/**
 * Send an email. By default, emails are queued and batch-coalesced to avoid
 * hitting Resend's per-second rate limit. Use `priority: 'high'` for auth-critical
 * emails that must be sent immediately.
 */
export async function sendEmail(params: SendEmailParams) {
  const queued: QueuedEmail = {
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
    userId: params.userId,
    priority: params.priority,
  }

  if (params.priority === 'high') {
    // Bypass queue — send immediately and return result
    return sendEmailRaw(params)
  }

  // Queue for throttled delivery — returns immediately
  queueEmail(queued)
  return { success: true, queued: true, error: undefined }
}

// Send notification to admin
export async function notifyAdmin(subject: string, html: string) {
  return sendEmail({
    to: config.notifications.email.adminEmail,
    subject: `[${config.app.name}] ${subject}`,
    html: wrapAdminEmail(html),
  })
}
