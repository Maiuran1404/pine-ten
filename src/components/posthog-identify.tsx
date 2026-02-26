'use client'

import { useEffect } from 'react'
import { usePostHog } from 'posthog-js/react'
import { useSession } from '@/lib/auth-client'

/**
 * Identifies the current user to PostHog with role and company group.
 * Mirrors the SentryProvider pattern — placed per-route-group layout.
 */
export function PostHogIdentify() {
  const { data: session } = useSession()
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog) return

    if (session?.user) {
      const user = session.user as {
        id: string
        email?: string
        name?: string
        role?: string
        companyId?: string
      }

      posthog.identify(user.id, {
        email: user.email,
        name: user.name,
        user_role: user.role ?? 'unknown',
      })

      // Register super properties (sent with every event)
      posthog.register({
        user_role: user.role ?? 'unknown',
        portal: getPortalFromHostname(),
      })

      // Group analytics by company
      if (user.companyId) {
        posthog.group('company', user.companyId)
      }
    } else {
      posthog.reset()
    }
  }, [session, posthog])

  return null
}

function getPortalFromHostname(): string {
  if (typeof window === 'undefined') return 'unknown'
  const hostname = window.location.hostname
  if (hostname.startsWith('artist')) return 'artist'
  if (hostname.startsWith('superadmin')) return 'admin'
  return 'client'
}
