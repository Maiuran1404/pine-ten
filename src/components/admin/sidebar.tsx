'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  UserCheck,
  Settings,
  Tags,
  Database,
  Ticket,
  MessageSquare,
  DollarSign,
  Bell,
  Wand2,
  Palette,
  LayoutTemplate,
  Shield,
  ClipboardCheck,
  Image,
  Sparkles,
  Brain,
  Video,
} from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import {
  SidebarGroupedNavigation,
  SidebarRecents,
  type NavigationGroup,
} from '@/components/shared/sidebar'

const navigationGroups: NavigationGroup[] = [
  {
    label: 'Overview',
    items: [
      {
        name: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
      },
      {
        name: 'Revenue',
        href: '/admin/revenue',
        icon: DollarSign,
      },
    ],
  },
  {
    label: 'Operations',
    items: [
      {
        name: 'All Tasks',
        href: '/admin/tasks',
        icon: FolderOpen,
      },
      {
        name: 'Verify',
        href: '/admin/verify',
        icon: ClipboardCheck,
      },
      {
        name: 'Assignment Algorithm',
        href: '/admin/algorithm',
        icon: Brain,
      },
    ],
  },
  {
    label: 'People',
    items: [
      {
        name: 'Clients',
        href: '/admin/clients',
        icon: Users,
      },
      {
        name: 'Artists',
        href: '/admin/freelancers',
        icon: UserCheck,
      },
    ],
  },
  {
    label: 'Libraries',
    items: [
      {
        name: 'Categories',
        href: '/admin/categories',
        icon: Tags,
      },
      {
        name: 'Brand Library',
        href: '/admin/brand-references',
        icon: Palette,
      },
      {
        name: 'Reference Library',
        href: '/admin/deliverable-styles',
        icon: LayoutTemplate,
      },
      {
        name: 'Video Library',
        href: '/admin/video-references',
        icon: Video,
      },
    ],
  },
  {
    label: 'Tools',
    items: [
      {
        name: 'Chat Logs',
        href: '/admin/chat-logs',
        icon: MessageSquare,
      },
      {
        name: 'Quick Design',
        href: '/admin/orshot-templates',
        icon: Wand2,
      },
      {
        name: 'Intake Prompts',
        href: '/admin/creative-intake-prompts',
        icon: Sparkles,
      },
      {
        name: 'Coupons',
        href: '/admin/coupons',
        icon: Ticket,
      },
    ],
  },
  {
    label: 'System',
    items: [
      {
        name: 'Notifications',
        href: '/admin/notifications',
        icon: Bell,
      },
      {
        name: 'Security',
        href: '/admin/security',
        icon: Shield,
      },
      {
        name: 'Database',
        href: '/admin/database',
        icon: Database,
      },
      {
        name: 'Settings',
        href: '/admin/settings',
        icon: Settings,
      },
    ],
  },
]

interface AdminSidebarProps {
  recentTasks?: Array<{ id: string; title: string }>
}

export function AdminSidebar({ recentTasks = [] }: AdminSidebarProps) {
  // Transform recent tasks to RecentItem format
  const recentItems = recentTasks.map((task) => ({
    id: task.id,
    title: task.title,
    href: `/admin/tasks/${task.id}`,
  }))

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      <SidebarHeader className="h-16 justify-center">
        <div className="flex items-center gap-2">
          <SidebarTrigger />
          <Logo href="/admin" name="Superadmin" className="group-data-[collapsible=icon]:hidden" />
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarGroupedNavigation
              groups={navigationGroups}
              basePath="/admin"
              accentColor="rose"
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarRecents items={recentItems} title="Recent Tasks" />
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="px-2 py-2">
          <p className="text-xs opacity-50">Admin Panel</p>
          <p className="text-xs opacity-70">Platform Control</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
