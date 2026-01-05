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
  Home,
  FileText,
  Wand2,
  Wallet,
  Settings2,
  History,
} from "lucide-react";

const navigation = [
  {
    name: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "My Tasks",
    href: "/dashboard/tasks",
    icon: FileText,
  },
  {
    name: "My Brand",
    href: "/dashboard/brand",
    icon: Wand2,
  },
  {
    name: "Credits",
    href: "/dashboard/credits",
    icon: Wallet,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings2,
  },
];

interface AppSidebarProps {
  recentTasks?: Array<{ id: string; title: string }>;
}

export function AppSidebar({ recentTasks = [] }: AppSidebarProps) {
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
                // For home (/dashboard), only match exact path
                // For other routes, match if pathname starts with the href
                const isActive = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.href);

                return (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.name}
                      className={`rounded-xl ${
                        isActive
                          ? "bg-emerald-950/80 text-emerald-400 hover:bg-emerald-950 hover:text-emerald-400"
                          : ""
                      }`}
                    >
                      <Link href={item.href} onClick={handleLinkClick}>
                        <item.icon className={isActive ? "text-emerald-400" : ""} />
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
              Recents
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
                      <Link href={`/dashboard/tasks/${task.id}`} onClick={handleLinkClick}>
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
          <p className="text-xs opacity-50">Need help?</p>
          <a
            href="mailto:maiuran@craftedstudio.ai?subject=Support Request"
            className="text-xs opacity-70 hover:opacity-100 underline underline-offset-4"
          >
            Contact support
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
