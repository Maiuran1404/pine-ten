"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
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
  History,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "All Tasks",
    href: "/admin/tasks",
    icon: FolderOpen,
  },
  {
    name: "Clients",
    href: "/admin/clients",
    icon: Users,
  },
  {
    name: "Freelancers",
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
    name: "Coupons",
    href: "/admin/coupons",
    icon: Ticket,
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
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      <SidebarHeader className="h-16 justify-center">
        <SidebarTrigger />
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const isActive = item.href === "/admin"
                  ? pathname === "/admin"
                  : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={`rounded-xl ${
                        isActive
                          ? "bg-rose-950/80 text-rose-400 hover:bg-rose-950 hover:text-rose-400"
                          : ""
                      }`}
                    >
                      <Link href={item.href} onClick={handleLinkClick}>
                        <item.icon className={isActive ? "text-rose-400" : ""} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {recentTasks.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-wider text-xs opacity-50">
              Recent Tasks
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {recentTasks.slice(0, 5).map((task) => (
                  <SidebarMenuItem key={task.id}>
                    <SidebarMenuButton
                      asChild
                      tooltip={task.title}
                      className="rounded-xl"
                    >
                      <Link href={`/admin/tasks/${task.id}`} onClick={handleLinkClick}>
                        <History className="h-4 w-4" />
                        <span className="truncate">{task.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
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
