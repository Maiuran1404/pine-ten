// This file configures the initialization of Sentry for edge features (middleware, edge routes).
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV !== 'test',

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,

  // Route-aware trace sampling (no profiling on edge)
  tracesSampler: ({ name, parentSampled }) => {
    if (parentSampled !== undefined) return parentSampled
    if (name?.includes('/monitoring')) return 0
    return 0.1
  },

  // Filter noise from expected errors
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value || ''

    if (message.includes('NEXT_NOT_FOUND') || message.includes('NEXT_REDIRECT')) {
      return null
    }

    return event
  },

  enableLogs: true,
  sendDefaultPii: true,
})
