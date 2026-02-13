/**
 * Slack Configuration Test Endpoint
 * Use this to verify Slack is configured correctly
 */

import { NextRequest, NextResponse } from 'next/server'
import { isSlackConfigured, getChannelConfig } from '@/lib/slack'

export async function GET(request: NextRequest) {
  // Only allow in development or with a secret query param
  const searchParams = request.nextUrl.searchParams
  const testKey = searchParams.get('key')

  if (process.env.NODE_ENV === 'production' && testKey !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 401 })
  }

  const botToken = process.env.SLACK_BOT_TOKEN
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  const channels = getChannelConfig()

  return NextResponse.json({
    configured: isSlackConfigured(),
    botToken: botToken
      ? `Set (${botToken.length} chars, starts with ${botToken.slice(0, 8)}...)`
      : 'NOT SET',
    signingSecret: signingSecret
      ? `Set (${signingSecret.length} chars, starts with ${signingSecret.slice(0, 8)}...)`
      : 'NOT SET',
    channels: {
      superadminAlerts: channels.superadminAlerts
        ? `Set (${channels.superadminAlerts})`
        : 'NOT SET',
      newSignups: channels.newSignups ? `Set (${channels.newSignups})` : 'NOT SET',
      allTasks: channels.allTasks ? `Set (${channels.allTasks})` : 'NOT SET',
      freelancerApps: channels.freelancerApps ? `Set (${channels.freelancerApps})` : 'NOT SET',
      creditPurchases: channels.creditPurchases ? `Set (${channels.creditPurchases})` : 'NOT SET',
      pendingReviews: channels.pendingReviews ? `Set (${channels.pendingReviews})` : 'NOT SET',
    },
    expectedInteractionsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/slack/interactions`,
    expectedEventsUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/slack/events`,
  })
}
