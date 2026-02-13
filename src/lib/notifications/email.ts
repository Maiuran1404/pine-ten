import { Resend } from 'resend'
import { config } from '@/lib/config'
import { logger } from '@/lib/logger'
import { wrapAdminEmail } from './email/layout'

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

interface EmailParams {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: EmailParams) {
  try {
    logger.debug({ to, subject }, 'Sending email')

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
    return { success: true, id: data?.id }
  } catch (error) {
    logger.error({ err: error, to, subject }, 'Email exception')
    return { success: false, error }
  }
}

// Send notification to admin
export async function notifyAdmin(subject: string, html: string) {
  return sendEmail({
    to: config.notifications.email.adminEmail,
    subject: `[${config.app.name}] ${subject}`,
    html: wrapAdminEmail(html),
  })
}
