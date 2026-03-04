import { requireAdmin } from '@/lib/require-auth'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { sendEmail } from '@/lib/notifications'

// GET - Test email sending (admin only)
export async function GET() {
  return withErrorHandling(
    async () => {
      const { user } = await requireAdmin()

      // Try to send a test email to the admin
      if (!user.email) {
        throw Errors.badRequest('Admin user has no email address configured')
      }

      const result = await sendEmail({
        to: user.email,
        subject: 'Test Email from Crafted',
        html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Test Email</h2>
          <p>This is a test email from Crafted.</p>
          <p>If you received this, your email configuration is working!</p>
          <p>Time: ${new Date().toISOString()}</p>
        </div>
      `,
        priority: 'high', // Bypass queue for test — need synchronous result
      })

      return successResponse({
        success: result.success,
        error: result.error,
        sentTo: user.email,
        timestamp: new Date().toISOString(),
      })
    },
    { endpoint: 'GET /api/admin/test-email' }
  )
}
