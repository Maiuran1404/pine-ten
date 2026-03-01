'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FreelancerSidebar } from '@/components/freelancer/sidebar'
import { Header } from '@/components/dashboard/header'
import { FullPageLoader } from '@/components/shared/loading'
import { useSession } from '@/lib/auth-client'
import { useSubdomain } from '@/hooks/use-subdomain'
import { logger } from '@/lib/logger'
import { SentryProvider } from '@/providers/sentry-provider'
import { PostHogIdentify } from '@/components/posthog-identify'
import type { FreelancerProfileState } from '@/types'

export default function FreelancerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const portal = useSubdomain()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [profileStatus, setProfileStatus] = useState<FreelancerProfileState>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(true)

  // Set page title for artist portal
  useEffect(() => {
    document.title = 'Artist'
  }, [])

  // Fetch profile status to determine if artist is under review
  useEffect(() => {
    const fetchProfileStatus = async () => {
      try {
        const res = await fetch('/api/freelancer/profile')
        if (res.ok) {
          const data = await res.json()
          setProfileStatus(data.data?.status)
        }
      } catch (error) {
        logger.error({ err: error }, 'Failed to fetch profile status')
      } finally {
        setIsStatusLoading(false)
      }
    }

    if (session) {
      fetchProfileStatus()
    }
  }, [session])

  useEffect(() => {
    // Wait for BOTH auth state AND portal detection before any redirects
    if (isPending || !portal.isHydrated) {
      return
    }

    // Only redirect to /login when truly unauthenticated.
    // Wrong-role cases are handled in render (not redirect) to avoid
    // redirect loops: /portal → /login → /portal when login page auto-redirects.
    if (!session) {
      router.push('/login')
    }
  }, [session, isPending, router, portal.isHydrated])

  if (isPending || !portal.isHydrated || isStatusLoading) {
    return <FullPageLoader />
  }

  if (!session) {
    return null
  }

  const user = session.user as { role?: string }
  if (user.role !== 'FREELANCER' && user.role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access the artist portal.
          </p>
          <div className="flex gap-3 justify-center">
            <a
              href={`http://${typeof window !== 'undefined' ? window.location.hostname.replace('artist.', 'app.') : 'app.localhost'}:${typeof window !== 'undefined' ? window.location.port : '3000'}/dashboard`}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <SentryProvider>
      <PostHogIdentify />
      <div className="flex h-screen overflow-hidden">
        <FreelancerSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          profileStatus={profileStatus}
        />
        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <Header onMenuClick={() => setSidebarOpen(true)} basePath="/portal" showUpgrade={false} />
          <main className="flex-1 overflow-auto p-4 sm:p-6 min-w-0">{children}</main>
        </div>
      </div>
    </SentryProvider>
  )
}
