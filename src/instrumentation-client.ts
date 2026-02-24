// This file configures the initialization of Sentry on the client.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
      networkDetailAllowUrls: [/\/api\//],
    }),
  ],

  // Route-aware trace sampling
  tracesSampler: ({ name, parentSampled }) => {
    if (parentSampled !== undefined) return parentSampled
    if (name?.includes('/_next/') || name?.includes('/favicon')) return 0
    if (name?.includes('/monitoring')) return 0
    return 0.1
  },

  // Suppress known browser noise
  ignoreErrors: [
    // Browser resize observer noise
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Browser extensions injecting errors
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Network errors users see when offline
    'Network request failed',
    'Failed to fetch',
    'Load failed',
    'NetworkError',
    // Next.js client-side navigation (not real errors)
    'NEXT_NOT_FOUND',
    'NEXT_REDIRECT',
    // AbortController (user navigated away)
    'AbortError',
    'The operation was aborted',
  ],

  // Don't report errors from third-party scripts
  denyUrls: [
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    /extensions\//i,
    /^safari-extension:\/\//,
  ],

  // Custom fingerprinting for Anthropic API errors
  beforeSend(event) {
    const message = event.exception?.values?.[0]?.value || ''

    // Group Anthropic rate limit / overload errors together
    if (message.includes('anthropic') || message.includes('overloaded')) {
      event.fingerprint = ['anthropic-api-error']
    }

    return event
  },

  // Replay configuration
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  enableLogs: true,
  sendDefaultPii: true,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
