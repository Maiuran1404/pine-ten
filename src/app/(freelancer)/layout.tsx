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

    if (!session) {
      router.push('/login')
      return
    }

    // Check if user is a freelancer
    if (session?.user) {
      const user = session.user as { role?: string }
      if (user.role !== 'FREELANCER' && user.role !== 'ADMIN') {
        router.push('/login')
      }
    }
  }, [session, isPending, router, portal.isHydrated])

  if (isPending || !portal.isHydrated || isStatusLoading) {
    return <FullPageLoader />
  }

  if (!session) {
    return null
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
