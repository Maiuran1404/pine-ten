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

  // Filter noise from expected errors + strip PII
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value || ''

    if (message.includes('NEXT_NOT_FOUND') || message.includes('NEXT_REDIRECT')) {
      return null
    }

    // GDPR: do not send PII to Sentry (US-based)
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      if (event.request.env) delete event.request.env;
    }
    if (event.user) {
      delete event.user.ip_address;
      delete event.user.email;
    }

    return event
  },

  enableLogs: true,
  // GDPR: do not send PII to Sentry (US-based)
  sendDefaultPii: false,
})
