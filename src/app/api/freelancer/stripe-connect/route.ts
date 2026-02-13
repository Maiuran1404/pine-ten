import 'server-only'

import { NextRequest } from 'next/server'
import {
  createConnectAccount,
  getConnectAccount,
  getOnboardingLink,
  getDashboardLink,
  syncConnectAccountStatus,
} from '@/lib/stripe-connect'
import { stripeConnectActionSchema } from '@/lib/validations'
import { withErrorHandling, successResponse, Errors } from '@/lib/errors'
import { requireAuth } from '@/lib/require-auth'

/**
 * GET /api/freelancer/stripe-connect
 * Get the freelancer's Stripe Connect account status
 */
export async function GET() {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const account = await getConnectAccount(user.id)

      if (!account) {
        return successResponse({
          connected: false,
          account: null,
        })
      }

      // Sync latest status from Stripe
      const status = await syncConnectAccountStatus(account.stripeAccountId)

      return successResponse({
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
    },
    { endpoint: 'GET /api/freelancer/stripe-connect' }
  )
}

/**
 * POST /api/freelancer/stripe-connect
 * Create a Stripe Connect account or get onboarding link
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(
    async () => {
      const { user } = await requireAuth()

      const { action, country } = stripeConnectActionSchema.parse(await request.json())

      const existingAccount = await getConnectAccount(user.id)

      if (action === 'create') {
        // Create new Connect account
        if (existingAccount) {
          // Account exists, return onboarding link
          const onboardingUrl = await getOnboardingLink(existingAccount.stripeAccountId)
          return successResponse({
            accountId: existingAccount.stripeAccountId,
            onboardingUrl,
          })
        }

        // Create new account
        const result = await createConnectAccount(user.id, user.email, country || 'US')

        return successResponse(result)
      }

      if (action === 'onboarding') {
        // Get onboarding link for existing account
        if (!existingAccount) {
          throw Errors.notFound('Stripe Connect account')
        }

        const onboardingUrl = await getOnboardingLink(existingAccount.stripeAccountId)
        return successResponse({ onboardingUrl })
      }

      if (action === 'dashboard') {
        // Get Stripe Express dashboard link
        if (!existingAccount) {
          throw Errors.notFound('Stripe Connect account')
        }

        if (!existingAccount.detailsSubmitted) {
          throw Errors.badRequest('Please complete onboarding first')
        }

        const dashboardUrl = await getDashboardLink(existingAccount.stripeAccountId)
        return successResponse({ dashboardUrl })
      }

      throw Errors.badRequest('Invalid action')
    },
    { endpoint: 'POST /api/freelancer/stripe-connect' }
  )
}
