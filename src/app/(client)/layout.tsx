'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/dashboard/sidebar'
import { FullPageLoader } from '@/components/shared/loading'
import { useSession } from '@/lib/auth-client'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { CreditProvider } from '@/providers/credit-provider'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session, isPending } = useSession()

  // Check if we're on the chat page - which has its own layout
  // Note: /dashboard/chat now redirects to /dashboard, but we keep this check
  // in case anyone lands on the redirect page briefly
  const isChatPage = pathname?.startsWith('/dashboard/chat')
  const isDashboardRoot = pathname === '/dashboard'
  const [sidebarOpen, setSidebarOpen] = useState(!isDashboardRoot)

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

  // Chat page has its own full-screen layout
  if (isChatPage) {
    return (
      <CreditProvider>
        <SidebarProvider
          defaultOpen={false}
          className=""
          style={
            { fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif" } as React.CSSProperties
          }
        >
          <div className="h-screen w-screen overflow-hidden bg-gray-50 dark:bg-zinc-950">
            {children}
          </div>
        </SidebarProvider>
      </CreditProvider>
    )
  }

  return (
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
  )
}
