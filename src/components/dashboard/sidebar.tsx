"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Plus,
  MessageCircle,
  CheckSquare,
  FolderOpen,
  Coins,
  Archive,
  PanelLeftClose,
  PanelLeft,
  Trash2,
} from "lucide-react";
import { getDrafts, deleteDraft, generateDraftId, type ChatDraft } from "@/lib/chat-drafts";
import { useSession } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

interface AppSidebarProps {
  recentTasks?: Array<{ id: string; title: string; status?: string }>;
}

export function AppSidebar({ recentTasks = [] }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [chatDrafts, setChatDrafts] = useState<ChatDraft[]>([]);
  const [credits, setCredits] = useState<number>(0);
  const { data: session } = useSession();
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";

  // Load credits
  useEffect(() => {
    const loadCredits = async () => {
      try {
        const response = await fetch("/api/user/billing");
        if (response.ok) {
          const data = await response.json();
          setCredits(data.credits || 0);
        }
      } catch (error) {
        console.error("Failed to load credits:", error);
      }
    };

    if (session?.user) {
      loadCredits();
    }
  }, [session]);

  // Load chat drafts from localStorage
  useEffect(() => {
    const loadDrafts = () => {
      const drafts = getDrafts();
      setChatDrafts(drafts);
    };

    loadDrafts();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "chat-drafts") {
        loadDrafts();
      }
    };

    const handleDraftUpdate = () => loadDrafts();
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("drafts-updated", handleDraftUpdate);

    const interval = setInterval(loadDrafts, 2000);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("drafts-updated", handleDraftUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleStartNewChat = () => {
    const newId = generateDraftId();
    router.push("/dashboard/chat");
  };

  const handleDeleteDraft = (e: React.MouseEvent, draftId: string) => {
    e.stopPropagation();
    e.preventDefault();
    deleteDraft(draftId);
    setChatDrafts(getDrafts());
  };

  // Features menu items - matching chat page design
  const features = [
    { icon: MessageCircle, label: "Chat", href: "/dashboard/chat" },
    { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
    { icon: FolderOpen, label: "Library", href: "/dashboard/designs" },
    { icon: Coins, label: "Credits", href: "/dashboard/credits" },
    { icon: Archive, label: "Archived", href: "/dashboard/tasks?status=completed" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard/chat") {
      return pathname?.startsWith("/dashboard/chat");
    }
    if (href.includes("?")) {
      return pathname === href.split("?")[0] && href.includes(window?.location?.search || "");
    }
    return pathname === href;
  };

  // Get the 10 most recent drafts
  const recentDrafts = chatDrafts.slice(0, 10);

  // When collapsed, show minimal sidebar
  if (isCollapsed) {
    return (
      <Sidebar
        collapsible="icon"
        className="border-r-0 bg-white dark:bg-zinc-950"
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        <SidebarHeader className="p-2 flex items-center justify-center">
          <button
            onClick={() => setOpen(true)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Expand sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        </SidebarHeader>
        <SidebarContent className="px-2">
          {/* New Chat button - icon only */}
          <div className="py-2">
            <Button
              onClick={handleStartNewChat}
              variant="outline"
              size="icon"
              className="w-10 h-10 border-border hover:bg-muted"
              title="New Chat"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {/* Feature icons */}
          <nav className="space-y-1 py-2">
            {features.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center justify-center p-2.5 rounded-lg transition-colors",
                  isActive(item.href)
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "text-foreground hover:bg-muted"
                )}
                title={item.label}
              >
                <item.icon className="h-5 w-5" />
              </Link>
            ))}
          </nav>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar
      collapsible="icon"
      className="border-r-0 bg-white dark:bg-zinc-950 w-64"
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      {/* Logo and collapse toggle */}
      <SidebarHeader className="flex flex-row items-center justify-between p-4 border-b border-border">
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
        <div className="px-4 pb-2">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Features</p>
          <nav className="space-y-1">
            {features.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Recent section */}
        <div className="flex-1 overflow-auto px-4 py-2">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">Recent</p>
          <div className="space-y-1">
            {recentDrafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/dashboard/chat?draft=${draft.id}`}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors group",
                  pathname === `/dashboard/chat` && new URLSearchParams(window?.location?.search || "").get("draft") === draft.id
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <span className="truncate flex-1">{draft.title}</span>
                <button
                  onClick={(e) => handleDeleteDraft(e, draft.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </Link>
            ))}
            {recentDrafts.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent chats
              </p>
            )}
          </div>
        </div>
      </SidebarContent>

      {/* Credits card at bottom */}
      <SidebarFooter className="p-4">
        <div className="rounded-2xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-950/40 p-4 border border-green-200/50 dark:border-green-800/50 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-2 right-2 w-16 h-16 bg-green-200/30 dark:bg-green-700/20 rounded-lg transform rotate-12" />
          <div className="absolute top-6 right-6 w-12 h-12 bg-green-300/30 dark:bg-green-600/20 rounded-lg transform -rotate-6" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">Starter Plan</span>
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium">{credits} Credits</span>
            </div>
            <Link href="/dashboard/credits">
              <Button size="sm" className="w-full h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium">
                Get more Credits!
              </Button>
            </Link>
            <p className="text-xs text-green-700 dark:text-green-400 mt-3 text-center leading-relaxed">
              Boost productivity with seamless tasks request and responsive AI, built to assist you.
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
