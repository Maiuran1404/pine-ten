'use client'

import { useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import {
  Plus,
  CheckSquare,
  FolderOpen,
  Coins,
  PanelLeftClose,
  PanelLeft,
  Building2,
  User,
  MessageSquare,
} from 'lucide-react'
import { ThemeToggle } from '@/components/theme-toggle'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useCredits } from '@/providers/credit-provider'
import { getDrafts } from '@/lib/chat-drafts'

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { credits } = useCredits()
  const { state, setOpen } = useSidebar()
  const isCollapsed = state === 'collapsed'

  // Load recent drafts (only when expanded)
  const drafts = useMemo(() => {
    if (isCollapsed) return []
    const allDrafts = getDrafts()
    // Show up to 5 recent drafts that have at least one user message
    return allDrafts.filter((d) => d.messages.some((m) => m.role === 'user')).slice(0, 5)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- pathname triggers refetch when navigating back
  }, [isCollapsed, pathname])

  const handleStartNewChat = () => {
    router.push('/dashboard/chat')
  }

  // Features menu items
  const features = [
    { icon: CheckSquare, label: 'Tasks', href: '/dashboard/tasks' },
    { icon: FolderOpen, label: 'Assets', href: '/dashboard/designs' },
    { icon: Building2, label: 'My Brand', href: '/dashboard/brand' },
    { icon: Coins, label: 'Credits', href: '/dashboard/credits' },
    { icon: User, label: 'Account', href: '/dashboard/settings' },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard/tasks') {
      return pathname === href || pathname?.startsWith('/dashboard/tasks/')
    }
    return pathname === href
  }

  // When collapsed, show minimal sidebar
  if (isCollapsed) {
    return (
      <Sidebar
        collapsible="icon"
        className="border-r border-border/40 bg-background shadow-sm"
        style={{ fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif" }}
      >
        <SidebarHeader className="p-2 flex items-center justify-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setOpen(true)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </SidebarHeader>
        <SidebarContent className="px-2 flex flex-col items-center">
          {/* New Chat button - icon only, centered */}
          <div className="py-2 flex justify-center w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleStartNewChat}
                  variant="outline"
                  size="icon"
                  className="w-10 h-10 border-border hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Chat</TooltipContent>
            </Tooltip>
          </div>
          {/* Feature icons - centered */}
          <nav className="space-y-1 py-2 w-full">
            {features.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center justify-center p-2.5 rounded-lg transition-colors',
                      isActive(item.href)
                        ? 'bg-crafted-green/10 dark:bg-crafted-green/20 text-crafted-forest dark:text-crafted-sage'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </nav>
          {/* Theme toggle */}
          <div className="py-2 flex justify-center w-full mt-auto">
            <ThemeToggle />
          </div>
        </SidebarContent>
      </Sidebar>
    )
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-border/40 bg-background shadow-sm w-64"
      style={{ fontFamily: "var(--font-satoshi, 'Satoshi'), sans-serif" }}
    >
      {/* Logo and collapse toggle */}
      <SidebarHeader className="flex flex-row items-center justify-between p-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/craftedfigureblack.png"
            alt="Crafted"
            width={28}
            height={28}
            className="dark:hidden"
          />
          <Image
            src="/craftedfigurewhite.png"
            alt="Crafted"
            width={28}
            height={28}
            className="hidden dark:block"
          />
          <span className="font-semibold text-lg text-foreground">Crafted</span>
        </Link>
        <button
          onClick={() => setOpen(false)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </SidebarHeader>

      <SidebarContent className="flex flex-col flex-1 overflow-hidden">
        {/* New Chat button */}
        <div className="p-4">
          <Button
            onClick={handleStartNewChat}
            variant="outline"
            className="w-full justify-start gap-2 h-11 border-border hover:bg-muted text-foreground"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
        </div>

        {/* Features section */}
        <div className="px-4 pb-2 flex-1">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
            Features
          </p>
          <nav className="space-y-1">
            {features.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-crafted-green/10 dark:bg-crafted-green/20 text-crafted-forest dark:text-crafted-sage'
                    : 'text-foreground hover:bg-muted'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Recent Drafts section */}
        {drafts.length > 0 && (
          <div className="px-4 pb-2">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Recent Drafts
            </p>
            <nav className="space-y-0.5">
              {drafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/dashboard/chat?draft=${draft.id}`}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{draft.title || 'Untitled draft'}</span>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </SidebarContent>

      {/* Theme toggle and Credits card at bottom */}
      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-crafted-green/15 to-crafted-green/5 dark:from-crafted-green/30 dark:to-crafted-forest/30 p-4 border border-crafted-green/20 dark:border-crafted-green/30 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-2 right-2 w-16 h-16 bg-crafted-mint/30 dark:bg-crafted-green/20 rounded-lg transform rotate-12" />
          <div className="absolute top-6 right-6 w-12 h-12 bg-crafted-sage/30 dark:bg-crafted-green-light/20 rounded-lg transform -rotate-6" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-crafted-forest dark:text-crafted-sage">
                Starter Plan
              </span>
              <span className="text-xs bg-crafted-green text-white px-2 py-1 rounded-full font-medium">
                {credits} Credits
              </span>
            </div>
            <Link href="/dashboard/credits">
              <Button
                size="sm"
                className="w-full h-10 bg-crafted-green hover:bg-crafted-forest text-white rounded-xl font-medium"
              >
                Get more Credits!
              </Button>
            </Link>
            <p className="text-xs text-crafted-forest dark:text-crafted-sage mt-3 text-center leading-relaxed">
              Boost productivity with seamless tasks request and responsive AI, built to assist you.
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
