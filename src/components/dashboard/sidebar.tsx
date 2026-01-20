"use client";

import { useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FolderKanban,
  Palette,
  CreditCard,
  Settings,
  Clock,
  MessageCircle,
  Zap,
  Sparkles,
  Wand2,
} from "lucide-react";
import { getDrafts, type ChatDraft } from "@/lib/chat-drafts";
import {
  SidebarNavigation,
  SidebarRecents,
  type NavigationItem,
  type RecentItem,
} from "@/components/shared/sidebar";
import { useSession } from "@/lib/auth-client";

const navigation: NavigationItem[] = [
  {
    name: "Home",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "My Tasks",
    href: "/dashboard/tasks",
    icon: FolderKanban,
  },
  {
    name: "My Brand",
    href: "/dashboard/brand",
    icon: Palette,
  },
  {
    name: "Designs",
    href: "/dashboard/designs",
    icon: Wand2,
  },
  {
    name: "Credits",
    href: "/dashboard/credits",
    icon: CreditCard,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

interface AppSidebarProps {
  recentTasks?: Array<{ id: string; title: string; status?: string }>;
}

export function AppSidebar({ recentTasks = [] }: AppSidebarProps) {
  const [chatDrafts, setChatDrafts] = useState<ChatDraft[]>([]);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState<string>("#FF6B6B");
  const { data: session } = useSession();

  // Load company data
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const response = await fetch("/api/user/company");
        if (response.ok) {
          const data = await response.json();
          if (data.company?.name) {
            setCompanyName(data.company.name);
          }
          if (data.company?.primaryColor) {
            setPrimaryColor(data.company.primaryColor);
          }
        }
      } catch (error) {
        console.error("Failed to load company data:", error);
      }
    };

    if (session?.user) {
      loadCompanyData();
    }
  }, [session]);

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

  // Active statuses - where artists are working
  const activeStatuses = ["ASSIGNED", "IN_PROGRESS", "IN_REVIEW", "REVISION_REQUESTED"];

  // Separate active tasks from other tasks
  const activeTasks = recentTasks.filter(t => t.status && activeStatuses.includes(t.status));
  const otherTasks = recentTasks.filter(t => !t.status || !activeStatuses.includes(t.status));

  // Transform active tasks to RecentItem format
  const activeItems: RecentItem[] = activeTasks.slice(0, 3).map((task) => ({
    id: task.id,
    title: task.title,
    href: `/dashboard/tasks/${task.id}`,
    icon: Sparkles,
    iconClassName: "bg-amber-400",
  }));

  // Only show drafts that have moodboard items (meaningful progress)
  const draftsWithMoodboard = chatDrafts.filter(
    d => d.moodboardItems && d.moodboardItems.length > 0
  );

  // Combine drafts with moodboard items and non-active tasks for recents
  const recentItems: RecentItem[] = [
    ...draftsWithMoodboard.map(d => ({
      id: d.id,
      title: d.title,
      href: `/dashboard/chat?draft=${d.id}`,
      icon: MessageCircle,
      iconClassName: "bg-emerald-400",
    })),
    ...otherTasks.map(t => ({
      id: t.id,
      title: t.title,
      href: `/dashboard/tasks/${t.id}`,
      icon: FolderKanban,
      iconClassName: "bg-muted-foreground/40",
    })),
  ].slice(0, 5);

  // Get first letter of company name for avatar
  const getInitial = (name: string | null) => {
    if (!name) return "C";
    return name.charAt(0).toUpperCase();
  };

  const displayName = companyName || "My Company";

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      <SidebarHeader className="h-16 px-3 py-2 group-data-[collapsible=icon]:px-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            {/* Sidebar Toggle */}
            <SidebarMenuButton asChild className="size-8 p-2 flex-shrink-0">
              <SidebarTrigger />
            </SidebarMenuButton>

            {/* Company Info - hidden when collapsed */}
            <div className="h-10 px-2 flex items-center gap-2 flex-1 group-data-[collapsible=icon]:hidden">
              {/* Company Avatar */}
              <div
                className="flex items-center justify-center size-6 rounded-md text-white text-xs font-semibold flex-shrink-0"
                style={{ backgroundColor: primaryColor }}
              >
                {getInitial(companyName)}
              </div>
              {/* Company Name */}
              <span className="flex-1 text-left font-medium text-sm truncate">
                {displayName}
              </span>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarNavigation
              items={navigation}
              basePath="/dashboard"
              accentColor="emerald"
            />
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Active Tasks - where artists are working */}
        <SidebarRecents
          items={activeItems}
          title="Active"
          icon={Zap}
          maxItems={3}
        />

        {/* Recents - drafts and completed/pending tasks */}
        <SidebarRecents
          items={recentItems}
          title="Recents"
          icon={Clock}
        />
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:hidden">
        <div className="px-2 py-2">
          <p className="text-xs opacity-50">Need help?</p>
          <a
            href="mailto:maiuran@getcrafted.ai?subject=Support Request"
            className="text-xs opacity-70 hover:opacity-100 underline underline-offset-4"
          >
            Contact support
          </a>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
