// This file configures the initialization of Sentry on the server.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'
import { nodeProfilingIntegration } from '@sentry/profiling-node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  enabled: process.env.NODE_ENV !== 'test',

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,

  integrations: [nodeProfilingIntegration()],

  // Continuous profiling — sample 10% of sessions
  profileSessionSampleRate: 0.1,

  // Route-aware trace sampling
  tracesSampler: ({ name, parentSampled }) => {
    // Inherit parent decision for distributed traces
    if (parentSampled !== undefined) return parentSampled

    // Health checks and monitoring — don't trace
    if (name?.includes('/api/health') || name?.includes('/monitoring')) return 0

    // Static assets — don't trace
    if (name?.includes('/_next/') || name?.includes('/favicon')) return 0

    // API routes — sample more in production
    if (name?.includes('/api/')) return 0.3

    // Page loads
    return 0.1
  },

  // Filter noise from expected errors + strip PII
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value || ''

    // Next.js internal navigation errors — not real errors
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
