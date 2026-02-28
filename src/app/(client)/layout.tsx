'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/sidebar'
import { FullPageLoader } from '@/components/shared/loading'
import { useSession } from '@/lib/auth-client'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { CreditProvider } from '@/providers/credit-provider'
import { SentryProvider } from '@/providers/sentry-provider'
import { PostHogIdentify } from '@/components/posthog-identify'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = useSession()

  const isChatPage = pathname?.startsWith('/dashboard/chat')
  const isWebsiteProjectPage = pathname?.startsWith('/dashboard/website-project')
  const isFullScreenPage = isWebsiteProjectPage
  const isDashboardRoot = pathname === '/dashboard'
  // Sidebar collapsed by default on dashboard root and chat pages
  const [sidebarOpen, setSidebarOpen] = useState(!isDashboardRoot && !isChatPage)

  // Redirect based on auth state only (NOT role)
  // Users stay on the subdomain they logged into - no role-based redirects
  useEffect(() => {
    if (isPending) return

    // Not authenticated - redirect to login
    if (!session) {
      router.replace('/login')
      return
    }

    const user = session.user as { role?: string; onboardingCompleted?: boolean }

    // Check onboarding for clients only
    if (user.role === 'CLIENT' && !user.onboardingCompleted) {
      router.replace('/onboarding')
    }
  }, [session, isPending, router])

  // Show loading while checking session
  if (isPending) {
    return <FullPageLoader />
  }

  // Don't render anything if not authenticated (redirect will happen)
  if (!session) {
    return <FullPageLoader />
  }

  const user = session.user as { role?: string; onboardingCompleted?: boolean; credits?: number }

  // Don't render if onboarding not completed for clients (redirect will happen)
  if (user.role === 'CLIENT' && !user.onboardingCompleted) {
    return <FullPageLoader />
  }

  // Chat and website project pages have their own full-screen layout
  if (isFullScreenPage) {
    return (
      <SentryProvider>
        <PostHogIdentify />
        <CreditProvider>
          <SidebarProvider
            defaultOpen={false}
            className=""
            style={
              { fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif" } as React.CSSProperties
            }
          >
            <div className="h-screen w-screen overflow-hidden bg-background">{children}</div>
          </SidebarProvider>
        </CreditProvider>
      </SentryProvider>
    )
  }

  return (
    <SentryProvider>
      <CreditProvider>
        <SidebarProvider
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          className=""
          style={
            {
              fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif",
              '--sidebar-width': '16rem',
              '--sidebar-width-icon': '4.5rem',
            } as React.CSSProperties
          }
        >
          <AppSidebar />
          <SidebarInset className="bg-transparent">
            <main className="relative flex-1 overflow-auto">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </CreditProvider>
    </SentryProvider>
  )
}
