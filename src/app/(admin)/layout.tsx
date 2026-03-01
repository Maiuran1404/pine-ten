'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AdminSidebar } from '@/components/admin/sidebar'
import { Header } from '@/components/dashboard/header'
import { FullPageLoader } from '@/components/shared/loading'
import { useSession, signOut } from '@/lib/auth-client'
import { useSubdomain } from '@/hooks/use-subdomain'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { CreditProvider } from '@/providers/credit-provider'
import { SentryProvider } from '@/providers/sentry-provider'
import { PostHogIdentify } from '@/components/posthog-identify'

interface Task {
  id: string
  title: string
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: session, isPending } = useSession()
  const portal = useSubdomain()
  const [recentTasks, setRecentTasks] = useState<Task[]>([])

  // Set page title for admin portal
  useEffect(() => {
    document.title = 'Superadmin'
  }, [])

  useEffect(() => {
    // Wait for BOTH auth state AND portal detection before any redirects
    if (isPending || !portal.isHydrated) {
      return
    }

    // Only redirect to /login when truly unauthenticated.
    // Wrong-role cases are handled in render (not redirect) to avoid
    // redirect loops: /admin → /login → /admin when login page auto-redirects.
    if (!session) {
      router.push('/login')
    }
  }, [session, isPending, router, portal.isHydrated])

  // Fetch recent tasks for sidebar
  useEffect(() => {
    if (session) {
      fetch('/api/admin/tasks?limit=5')
        .then((res) => res.json())
        .then((data) => {
          if (data.data?.tasks) {
            setRecentTasks(
              data.data.tasks.map((t: { id: string; title: string }) => ({
                id: t.id,
                title: t.title,
              }))
            )
          }
        })
        .catch(console.error)
    }
  }, [session])

  if (isPending || !portal.isHydrated) {
    return <FullPageLoader />
  }

  if (!session) {
    return null
  }

  const user = session.user as { role?: string }
  if (user.role !== 'ADMIN' || portal.type !== 'superadmin') {
    // Build the client portal URL from the current hostname so the link works
    // in both dev (superadmin.localhost:3000 → app.localhost:3000) and production.
    const appHostname = window.location.hostname.replace('superadmin.', 'app.')
    const appOrigin = `${window.location.protocol}//${appHostname}${window.location.port ? `:${window.location.port}` : ''}`

    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            You don&apos;t have permission to access the admin portal.
          </p>
          {/* If the role in the session looks wrong, signing out clears the
              5-minute cookie cache so the next sign-in reads the DB role fresh. */}
          <p className="text-xs text-muted-foreground">
            If you are an admin, your session may be stale. Sign out and sign back in.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => signOut({ fetchOptions: { onSuccess: () => router.push('/login') } })}
              className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:opacity-90"
            >
              Sign Out
            </button>
            <a
              href={`${appOrigin}/dashboard`}
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
      <CreditProvider>
        <SidebarProvider
          defaultOpen={true}
          className="bg-background outline-none focus:outline-none"
          style={
            {
              fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif",
              '--sidebar-width': '16rem',
              '--sidebar-width-icon': '3rem',
            } as React.CSSProperties
          }
        >
          <AdminSidebar recentTasks={recentTasks} />
          <SidebarInset className="bg-background outline-none focus:outline-none min-w-0">
            <Header />
            <main className="flex-1 overflow-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20 outline-none focus:outline-none min-w-0">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </CreditProvider>
    </SentryProvider>
  )
}
