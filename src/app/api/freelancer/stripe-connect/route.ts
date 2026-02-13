import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import {
  createConnectAccount,
  getConnectAccount,
  getOnboardingLink,
  getDashboardLink,
  syncConnectAccountStatus,
} from '@/lib/stripe-connect'
import { logger } from '@/lib/logger'
import { stripeConnectActionSchema } from '@/lib/validations'
import { handleZodError } from '@/lib/errors'
import { ZodError } from 'zod'

/**
 * GET /api/freelancer/stripe-connect
 * Get the freelancer's Stripe Connect account status
 */
export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const account = await getConnectAccount(session.user.id)

    if (!account) {
      return NextResponse.json({
        connected: false,
        account: null,
      })
    }

    // Sync latest status from Stripe
    const status = await syncConnectAccountStatus(account.stripeAccountId)

    return NextResponse.json({
      connected: true,
      account: {
        id: account.id,
        stripeAccountId: account.stripeAccountId,
        chargesEnabled: status.chargesEnabled,
        payoutsEnabled: status.payoutsEnabled,
        detailsSubmitted: status.detailsSubmitted,
        externalAccountLast4: status.externalAccountLast4,
        externalAccountType: status.externalAccountType,
        country: account.country,
        defaultCurrency: account.defaultCurrency,
      },
    })
  } catch (error) {
    logger.error({ error }, 'Get Stripe Connect status error')
    return NextResponse.json({ error: 'Failed to get Stripe Connect status' }, { status: 500 })
  }
}

/**
 * POST /api/freelancer/stripe-connect
 * Create a Stripe Connect account or get onboarding link
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, country } = stripeConnectActionSchema.parse(body)

    const existingAccount = await getConnectAccount(session.user.id)

    if (action === 'create') {
      // Create new Connect account
      if (existingAccount) {
        // Account exists, return onboarding link
        const onboardingUrl = await getOnboardingLink(existingAccount.stripeAccountId)
        return NextResponse.json({
          accountId: existingAccount.stripeAccountId,
          onboardingUrl,
        })
      }

      // Create new account
      const result = await createConnectAccount(
        session.user.id,
        session.user.email,
        country || 'US'
      )

      return NextResponse.json(result)
    }

    if (action === 'onboarding') {
      // Get onboarding link for existing account
      if (!existingAccount) {
        return NextResponse.json({ error: 'No Stripe Connect account found' }, { status: 404 })
      }

      const onboardingUrl = await getOnboardingLink(existingAccount.stripeAccountId)
      return NextResponse.json({ onboardingUrl })
    }

    if (action === 'dashboard') {
      // Get Stripe Express dashboard link
      if (!existingAccount) {
        return NextResponse.json({ error: 'No Stripe Connect account found' }, { status: 404 })
      }

      if (!existingAccount.detailsSubmitted) {
        return NextResponse.json({ error: 'Please complete onboarding first' }, { status: 400 })
      }

      const dashboardUrl = await getDashboardLink(existingAccount.stripeAccountId)
      return NextResponse.json({ dashboardUrl })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    if (error instanceof ZodError) {
      return handleZodError(error)
    }
    logger.error({ error }, 'Stripe Connect action error')
    return NextResponse.json({ error: 'Failed to process Stripe Connect action' }, { status: 500 })
  }
}
