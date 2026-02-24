'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'
import { useSession } from '@/lib/auth-client'

export function SentryProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession()

  useEffect(() => {
    if (session?.user) {
      const user = session.user as { id: string; email?: string; role?: string }
      Sentry.setUser({
        id: user.id,
        email: user.email,
      })
      Sentry.setTag('user_role', user.role ?? 'unknown')
    } else {
      Sentry.setUser(null)
    }
  }, [session])

  return <>{children}</>
}
