'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    // Guard against double-init in React StrictMode (dev mode double-mount).
    // Without this, the first init's fetch requests get aborted on remount,
    // causing "[PostHog.js] AbortError: signal is aborted without reason".
    if (posthog.__loaded) return

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest',
      ui_host: 'https://eu.posthog.com',
      capture_pageview: false, // We handle this manually via PostHogPageview
      capture_pageleave: true,
      cross_subdomain_cookie: false, // Respect per-subdomain session isolation
      persistence: 'localStorage+cookie',
      autocapture: true,

      // Session replay config
      session_recording: {
        maskAllInputs: true, // Briefing chat + credit forms contain sensitive data
        maskTextSelector: '[data-ph-mask]',
      },

      // Performance
      loaded: (ph) => {
        if (process.env.NODE_ENV === 'development') {
          ph.debug()
        }
      },
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
