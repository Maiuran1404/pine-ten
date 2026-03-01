'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  CheckSquare,
  FolderOpen,
  PanelLeftClose,
  PanelLeft,
  Building2,
  MessageSquare,
  Coins,
  X,
  AlertTriangle,
} from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useCredits } from '@/providers/credit-provider'
import { getDrafts, deleteDraft } from '@/lib/chat-drafts'
import { useTasks } from '@/hooks/use-queries'
import { SidebarUserMenu } from '@/components/dashboard/sidebar-user-menu'
import type { BriefingStage } from '@/lib/ai/briefing-state-machine'

function formatBriefingStage(stage: BriefingStage | undefined | null): string {
  if (!stage) return 'Getting started'
  const labels: Record<BriefingStage, string> = {
    EXTRACT: 'Getting started',
    TASK_TYPE: 'Choosing type',
    INTENT: 'Defining intent',
    INSPIRATION: 'Selecting visuals',
    STRUCTURE: 'Building structure',
    ELABORATE: 'Adding details',
    STRATEGIC_REVIEW: 'Strategic review',
    MOODBOARD: 'Curating moodboard',
    REVIEW: 'Reviewing brief',
    DEEPEN: 'Refining details',
    SUBMIT: 'Ready to submit',
  }
  return labels[stage] || 'Getting started'
}

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { credits } = useCredits()
  const { state, setOpen } = useSidebar()
  const isCollapsed = state === 'collapsed'
  const { data: tasksData } = useTasks()
  const activeTasks = tasksData?.stats?.activeTasks ?? 0

  // Reactive drafts — lazy init + event-driven updates
  const [drafts, setDrafts] = useState(() => {
    const allDrafts = getDrafts()
    return allDrafts.filter((d) => d.messages.some((m) => m.role === 'user')).slice(0, 5)
  })

  const loadDrafts = useCallback(() => {
    const allDrafts = getDrafts()
    const filtered = allDrafts.filter((d) => d.messages.some((m) => m.role === 'user')).slice(0, 5)
    setDrafts(filtered)
  }, [])

  useEffect(() => {
    const handleDraftsUpdated = () => loadDrafts()
    window.addEventListener('drafts-updated', handleDraftsUpdated)
    return () => window.removeEventListener('drafts-updated', handleDraftsUpdated)
  }, [loadDrafts])

  // Reload drafts when navigating back to the sidebar
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(loadDrafts, [pathname])

  const handleStartNewProject = () => {
    router.push('/dashboard/chat')
  }

  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.preventDefault()
    e.stopPropagation()
    deleteDraft(draftId)
  }

  // Core nav items (Credits + Account moved to user menu)
  const features = [
    { icon: CheckSquare, label: 'Tasks', href: '/dashboard/tasks' },
    { icon: FolderOpen, label: 'Assets', href: '/dashboard/designs' },
    { icon: Building2, label: 'My Brand', href: '/dashboard/brand' },
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
          {/* New Project button - icon only */}
          <div className="py-2 flex justify-center w-full">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleStartNewProject}
                  variant="outline"
                  size="icon"
                  className="w-10 h-10 border-border hover:bg-muted"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Project</TooltipContent>
            </Tooltip>
          </div>
          {/* Feature icons */}
          <nav className="space-y-1 py-2 w-full">
            {features.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      'relative flex items-center justify-center p-2.5 rounded-lg transition-colors',
                      isActive(item.href)
                        ? 'bg-crafted-green/10 dark:bg-crafted-green/20 text-crafted-forest dark:text-crafted-sage'
                        : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.label === 'Tasks' && activeTasks > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-crafted-green" />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {item.label === 'Tasks' && activeTasks > 0
                    ? `Tasks (${activeTasks})`
                    : item.label}
                </TooltipContent>
              </Tooltip>
            ))}
          </nav>
        </SidebarContent>
        <SidebarFooter className="p-2 flex items-center justify-center">
          <SidebarUserMenu />
        </SidebarFooter>
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
        {/* New Project button */}
        <div className="p-4">
          <Button
            onClick={handleStartNewProject}
            variant="outline"
            className="w-full justify-start gap-2 h-11 border-border hover:bg-muted text-foreground"
          >
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </div>

        {/* Nav section - no heading */}
        <div className="px-4 pb-2">
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
                {item.label === 'Tasks' && activeTasks > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-auto bg-crafted-green/15 text-crafted-forest dark:text-crafted-sage border-0 text-xs px-1.5 py-0"
                  >
                    {activeTasks}
                  </Badge>
                )}
              </Link>
            ))}
          </nav>
        </div>

        {/* Recent Drafts section */}
        {drafts.length > 0 && (
          <div className="px-4 pb-2 flex-1 min-h-0 overflow-y-auto">
            <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
              Recent Drafts
            </p>
            <nav className="space-y-0.5">
              {drafts.map((draft) => (
                <Link
                  key={draft.id}
                  href={`/dashboard/chat?draft=${draft.id}`}
                  className={cn(
                    'group flex items-start gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
                    'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="truncate block">{draft.title || 'Untitled draft'}</span>
                    <span className="text-xs text-muted-foreground/70 block truncate">
                      {formatBriefingStage(draft.briefingState?.stage as BriefingStage)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteDraft(e, draft.id)}
                    className="shrink-0 p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10 transition-opacity mt-0.5"
                    title="Delete draft"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ))}
            </nav>
          </div>
        )}
      </SidebarContent>

      {/* Compact credits + user menu */}
      <SidebarFooter className="p-4 space-y-2">
        {/* Low credits warning */}
        {credits < 5 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ds-warning/10 text-ds-warning text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            Low credits remaining
          </div>
        )}

        {/* Compact credits row */}
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Coins className="h-4 w-4" />
            <span className="text-xs font-medium">Starter</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="bg-crafted-green/15 text-crafted-forest dark:text-crafted-sage border-0 text-xs"
            >
              {credits}
            </Badge>
            <Link
              href="/dashboard/credits"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Get more
            </Link>
          </div>
        </div>

        {/* User menu */}
        <SidebarUserMenu />
      </SidebarFooter>
    </Sidebar>
  )
}
