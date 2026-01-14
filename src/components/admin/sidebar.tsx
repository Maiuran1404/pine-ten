"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  UserCheck,
  Image,
  Settings,
  Tags,
  Database,
  Ticket,
  MessageSquare,
  DollarSign,
  Bell,
  ShieldCheck,
  Wand2,
  Palette,
  LayoutTemplate,
} from "lucide-react";
import { Logo } from "@/components/shared/logo";
import {
  SidebarNavigation,
  SidebarRecents,
  type NavigationItem,
} from "@/components/shared/sidebar";

const navigation: NavigationItem[] = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Revenue",
    href: "/admin/revenue",
    icon: DollarSign,
  },
  {
    name: "All Tasks",
    href: "/admin/tasks",
    icon: FolderOpen,
  },
  {
    name: "Verify",
    href: "/admin/verify",
    icon: ShieldCheck,
  },
  {
    name: "Clients",
    href: "/admin/clients",
    icon: Users,
  },
  {
    name: "Artists",
    href: "/admin/freelancers",
    icon: UserCheck,
  },
  {
    name: "Categories",
    href: "/admin/categories",
    icon: Tags,
  },
  {
    name: "Style Library",
    href: "/admin/styles",
    icon: Image,
  },
  {
    name: "Brand Library",
    href: "/admin/brand-references",
    icon: Palette,
  },
  {
    name: "Deliverable Styles",
    href: "/admin/deliverable-styles",
    icon: LayoutTemplate,
  },
  {
    name: "Quick Design",
    href: "/admin/orshot-templates",
    icon: Wand2,
  },
  {
    name: "Coupons",
    href: "/admin/coupons",
    icon: Ticket,
  },
  {
    name: "Chat Setup",
    href: "/admin/chat-setup",
    icon: MessageSquare,
  },
  {
    name: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    name: "Database",
    href: "/admin/database",
    icon: Database,
  },
  {
    name: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

interface AdminSidebarProps {
  recentTasks?: Array<{ id: string; title: string }>;
}

export function AdminSidebar({ recentTasks = [] }: AdminSidebarProps) {
  // Transform recent tasks to RecentItem format
  const recentItems = recentTasks.map((task) => ({
    id: task.id,
    title: task.title,
    href: `/admin/tasks/${task.id}`,
  }));

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
            <SidebarNavigation
              items={navigation}
              basePath="/admin"
              accentColor="rose"
            />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarRecents
          items={recentItems}
          title="Recent Tasks"
        />
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="px-2 py-2">
          <p className="text-xs opacity-50">Super Admin Panel</p>
          <p className="text-xs opacity-70">Full platform control</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
