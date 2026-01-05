"use client";

import { useState, useEffect } from "react";
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
  MessageSquare,
} from "lucide-react";
import { getDrafts, type ChatDraft } from "@/lib/chat-drafts";

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
  const [chatDrafts, setChatDrafts] = useState<ChatDraft[]>([]);

  // Load chat drafts from localStorage
  useEffect(() => {
    const loadDrafts = () => {
      const drafts = getDrafts();
      setChatDrafts(drafts);
    };

    loadDrafts();

    // Listen for storage changes (when drafts are updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "chat-drafts") {
        loadDrafts();
      }
    };

    // Also listen for custom events from same tab
    const handleDraftUpdate = () => loadDrafts();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("drafts-updated", handleDraftUpdate);

    // Poll for changes every 2 seconds (for same-tab updates)
    const interval = setInterval(loadDrafts, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("drafts-updated", handleDraftUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleLinkClick = () => {
    setOpenMobile(false);
  };

  // Combine and sort recents - drafts first (ongoing), then submitted tasks
  const allRecents = [
    ...chatDrafts.map(d => ({
      id: d.id,
      title: d.title,
      type: "draft" as const,
      updatedAt: d.updatedAt,
    })),
    ...recentTasks.map(t => ({
      id: t.id,
      title: t.title,
      type: "task" as const,
      updatedAt: new Date().toISOString(),
    })),
  ].slice(0, 5);

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

        {allRecents.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="uppercase tracking-wider text-xs opacity-50">
              Recents
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {allRecents.map((item) => (
                  <SidebarMenuItem key={`${item.type}-${item.id}`}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className="rounded-xl"
                    >
                      <Link
                        href={item.type === "draft" ? `/dashboard/chat?draft=${item.id}` : `/dashboard/tasks/${item.id}`}
                        onClick={handleLinkClick}
                      >
                        {item.type === "draft" ? (
                          <MessageSquare className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <History className="h-4 w-4" />
                        )}
                        <span className="truncate">{item.title}</span>
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
