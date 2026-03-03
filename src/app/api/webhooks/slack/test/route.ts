/**
 * Slack Configuration Test Endpoint
 * Use this to verify Slack is configured correctly
 * SECURITY: Requires admin auth — no longer uses password-based access
 */

import { isSlackConfigured, getChannelConfig } from '@/lib/slack'
import { withErrorHandling, successResponse } from '@/lib/errors'
import { requireAdmin } from '@/lib/require-auth'

export async function GET() {
  return withErrorHandling(
    async () => {
      await requireAdmin()

      const channels = getChannelConfig()

      // SECURITY: Never expose raw token values or prefixes
      return successResponse({
        configured: isSlackConfigured(),
        botToken: process.env.SLACK_BOT_TOKEN ? 'Set' : 'NOT SET',
        signingSecret: process.env.SLACK_SIGNING_SECRET ? 'Set' : 'NOT SET',
        channels: {
          superadminAlerts: channels.superadminAlerts ? 'Set' : 'NOT SET',
          newSignups: channels.newSignups ? 'Set' : 'NOT SET',
          allTasks: channels.allTasks ? 'Set' : 'NOT SET',
          freelancerApps: channels.freelancerApps ? 'Set' : 'NOT SET',
          creditPurchases: channels.creditPurchases ? 'Set' : 'NOT SET',
          pendingReviews: channels.pendingReviews ? 'Set' : 'NOT SET',
        },
      })
    },
    { endpoint: 'GET /api/webhooks/slack/test' }
  )
}
