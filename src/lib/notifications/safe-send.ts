import 'server-only'

import { db } from '@/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail, emailTemplates } from '@/lib/notifications/email'
import { logger } from '@/lib/logger'

interface EmailData {
  subject: string
  html: string
}

type EmailTemplates = typeof emailTemplates

interface UserInfo {
  name: string
  email: string
}

/**
 * Options for sending a notification email.
 * Provide either `to` (a direct email address) or `userId` (to look up from DB).
 */
type SendNotificationEmailOptions =
  | {
      /** Direct recipient email address */
      to: string
      userId?: never
      /** Callback that receives emailTemplates and produces the email data */
      template: (templates: EmailTemplates) => EmailData
      /** Optional subject override (replaces the template's subject) */
      subjectOverride?: string
      /** Optional html post-processor (e.g. string replace on the html) */
      transformHtml?: (html: string) => string
      /** Context for error logging */
      context?: string
    }
  | {
      to?: never
      /** User ID to look up email from the database */
      userId: string
      /** Callback that receives emailTemplates and the looked-up user, returns email data */
      template: (templates: EmailTemplates, user: UserInfo) => EmailData
      /** Optional subject override (replaces the template's subject) */
      subjectOverride?: string
      /** Optional html post-processor (e.g. string replace on the html) */
      transformHtml?: (html: string) => string
      /** Context for error logging */
      context?: string
    }

/**
 * Fire-and-forget email notification helper.
 *
 * Wraps the try-catch, optional user lookup, and error logging into a single
 * reusable function. The template callback receives `emailTemplates` so callers
 * don't need to import it separately. Failures are logged but never thrown.
 *
 * @example Direct email (recipient known):
 * ```ts
 * await sendNotificationEmail({
 *   to: user.email,
 *   template: (t) => t.taskApprovedForClient(name, title, url),
 *   context: 'task approval',
 * })
 * ```
 *
 * @example With userId lookup:
 * ```ts
 * await sendNotificationEmail({
 *   userId: session.user.id,
 *   template: (t, user) => t.welcomeClient(user.name, dashboardUrl),
 *   context: 'welcome email',
 * })
 * ```
 */
export async function sendNotificationEmail(options: SendNotificationEmailOptions): Promise<void> {
  try {
    let recipientEmail: string
    let emailData: EmailData

    if ('userId' in options && options.userId) {
      // Look up user email from database
      const [user] = await db
        .select({ name: users.name, email: users.email })
        .from(users)
        .where(eq(users.id, options.userId))
        .limit(1)

      if (!user?.email) {
        logger.warn(
          { userId: options.userId, context: options.context },
          'No email found for user, skipping notification'
        )
        return
      }

      recipientEmail = user.email
      emailData = options.template(emailTemplates, { name: user.name, email: user.email })
    } else {
      recipientEmail = options.to!
      emailData = (options.template as (templates: EmailTemplates) => EmailData)(emailTemplates)
    }

    const subject = options.subjectOverride ?? emailData.subject
    const html = options.transformHtml ? options.transformHtml(emailData.html) : emailData.html

    await sendEmail({ to: recipientEmail, subject, html })
  } catch (error) {
    logger.error(
      { err: error, context: options.context },
      `Failed to send notification email${options.context ? `: ${options.context}` : ''}`
    )
  }
}
