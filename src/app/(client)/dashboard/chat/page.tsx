"use client";

import { useState, useEffect, useRef, startTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/chat-interface";
import { getDrafts, generateDraftId, type ChatDraft } from "@/lib/chat-drafts";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Sparkles,
  MessageCircle,
  CheckSquare,
  FolderOpen,
  Coins,
  Archive,
  PanelLeftClose,
  PanelLeft,
  Moon,
  Sun,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import Link from "next/link";
import Image from "next/image";
import { useCredits } from "@/providers/credit-provider";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initializedRef = useRef(false);
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true); // Collapsed by default in chat

  // Get current URL params
  const draftParam = searchParams.get("draft");
  const messageParam = searchParams.get("message");
  const paymentParam = searchParams.get("payment");

  // Initialize drafts directly (only runs once on mount due to lazy initializer)
  const [drafts, setDrafts] = useState<ChatDraft[]>(() => {
    if (typeof window === "undefined") return [];
    return getDrafts();
  });

  // Initialize state based on URL - always generate a draftId to avoid regenerating on every render
  const [currentDraftId, setCurrentDraftId] = useState<string>(() => {
    if (draftParam) return draftParam;
    // Check for pending task state from payment return - restore draft ID
    if (typeof window !== "undefined" && paymentParam === "success") {
      try {
        const savedState = sessionStorage.getItem("pending_task_state");
        if (savedState) {
          const { draftId } = JSON.parse(savedState);
          if (draftId) return draftId;
        }
      } catch {
        // Ignore parsing errors
      }
    }
    // Always generate a stable ID upfront
    return generateDraftId();
  });

  // Always use seamless transition (full-width) layout when there are params
  const hasUrlParams = !!draftParam || !!messageParam || !!paymentParam;
  const [initialMessage, setInitialMessage] = useState<string | null>(
    () => messageParam
  );

  // Handle initial mount and URL changes
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      if (messageParam && !initialMessage) {
        setInitialMessage(messageParam);
      }
      return;
    }

    if (draftParam) {
      startTransition(() => {
        setCurrentDraftId(draftParam);
      });
    } else if (messageParam && messageParam !== initialMessage) {
      startTransition(() => {
        setInitialMessage(messageParam);
        const newId = generateDraftId();
        setCurrentDraftId(newId);
      });
    }
  }, [draftParam, messageParam, hasUrlParams, drafts.length, initialMessage]);

  const handleStartNew = () => {
    const newId = generateDraftId();
    setCurrentDraftId(newId);
    setInitialMessage(null);
    router.push("/dashboard/chat");
  };

  const handleDraftUpdate = () => {
    setDrafts(getDrafts());
  };

  // Get user credits from context
  const { credits: userCredits } = useCredits();

  // Features menu items
  const features = [
    {
      icon: MessageCircle,
      label: "Chat",
      href: "/dashboard/chat",
      active: true,
    },
    { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
    { icon: FolderOpen, label: "Library", href: "/dashboard/designs" },
    { icon: Coins, label: "Credits", href: "/dashboard/credits" },
    {
      icon: Archive,
      label: "Archived",
      href: "/dashboard/tasks?status=completed",
    },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50 dark:bg-zinc-950">
      {/* Left sidebar */}
      <div
        className={cn(
          "shrink-0 border-r border-border bg-white dark:bg-zinc-950 flex flex-col transition-all duration-300",
          sidebarCollapsed ? "w-0 overflow-hidden" : "w-64"
        )}
      >
        {/* Logo and collapse toggle */}
        <div className="flex items-center justify-between p-4 border-b border-border">
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
            <span className="font-semibold text-lg text-foreground">
              Crafted
            </span>
          </Link>
          <button
            onClick={() => setSidebarCollapsed(true)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* New Chat button */}
        <div className="p-4">
          <Button
            onClick={handleStartNew}
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
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  item.active
                    ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                    : "text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Credits card at bottom */}
        <div className="p-4">
          <div className="rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-950/40 p-4 border border-emerald-200/50 dark:border-emerald-800/50 relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute top-2 right-2 w-16 h-16 bg-emerald-200/30 dark:bg-emerald-700/20 rounded-lg transform rotate-12" />
            <div className="absolute top-6 right-6 w-12 h-12 bg-emerald-300/30 dark:bg-emerald-600/20 rounded-lg transform -rotate-6" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Starter Plan
                </span>
                <span className="text-xs bg-emerald-600 text-white px-2 py-1 rounded-full font-medium">
                  {userCredits} Credits
                </span>
              </div>
              <Link href="/dashboard/credits">
                <Button
                  size="sm"
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium"
                >
                  Get more Credits!
                </Button>
              </Link>
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-3 text-center leading-relaxed">
                Boost productivity with seamless tasks request and responsive
                AI, built to assist you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden">
        {/* Soft gradient emerald/mint background at top */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(180deg,
              rgba(209, 250, 229, 0.4) 0%,
              rgba(236, 253, 245, 0.2) 15%,
              rgba(255, 255, 255, 0) 30%
            )`,
          }}
        />
        {/* Dark mode overlay */}
        <div
          className="absolute inset-0 pointer-events-none dark:opacity-100 opacity-0 transition-opacity"
          style={{
            background: `linear-gradient(180deg,
              rgba(6, 78, 59, 0.15) 0%,
              rgba(10, 10, 10, 0.5) 15%,
              rgba(10, 10, 10, 1) 30%
            )`,
          }}
        />

        {/* Top bar */}
        <div className="relative z-20 shrink-0 flex items-center justify-between px-6 py-4">
          {/* Left side - sidebar toggle and model selector */}
          <div className="flex items-center gap-4">
            {sidebarCollapsed && (
              <button
                onClick={() => setSidebarCollapsed(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/50 dark:hover:bg-muted transition-colors"
                title="Expand sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Right side - actions */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard/credits">
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-4 rounded-xl border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm hover:bg-white dark:hover:bg-card gap-2"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade
              </Button>
            </Link>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl border border-border bg-white/80 dark:bg-card/80 backdrop-blur-sm hover:bg-white dark:hover:bg-card transition-colors"
              title="Toggle theme"
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5 text-foreground" />
              ) : (
                <Moon className="h-5 w-5 text-foreground" />
              )}
            </button>
            {/* User avatar */}
            <div className="w-10 h-10 rounded-full border border-border bg-white dark:bg-card overflow-hidden flex items-center justify-center">
              {session?.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user.name || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Chat content */}
        <div className="relative z-10 flex-1 flex flex-col min-h-0">
          <ChatInterface
            draftId={currentDraftId}
            onDraftUpdate={handleDraftUpdate}
            initialMessage={initialMessage}
            seamlessTransition={true}
            showRightPanel={true}
            onChatStart={() => {}}
          />
        </div>
      </div>
    </div>
  );
}
