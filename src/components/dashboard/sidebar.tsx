"use client";

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
  CheckSquare,
  FolderOpen,
  Coins,
  PanelLeftClose,
  PanelLeft,
  Building2,
  User,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { useCredits } from "@/providers/credit-provider";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { credits } = useCredits();
  const { state, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";

  const handleStartNewChat = () => {
    router.push("/dashboard");
  };

  // Features menu items
  const features = [
    { icon: CheckSquare, label: "Tasks", href: "/dashboard/tasks" },
    { icon: FolderOpen, label: "Library", href: "/dashboard/designs" },
    { icon: Building2, label: "My Brand", href: "/dashboard/brand" },
    { icon: Coins, label: "Credits", href: "/dashboard/credits" },
    { icon: User, label: "Account", href: "/dashboard/settings" },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard/tasks") {
      return pathname === href || pathname?.startsWith("/dashboard/tasks/");
    }
    return pathname === href;
  };

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
        <SidebarContent className="px-2 flex flex-col items-center">
          {/* New Chat button - icon only, centered */}
          <div className="py-2 flex justify-center w-full">
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
          {/* Feature icons - centered */}
          <nav className="space-y-1 py-2 w-full">
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
          {/* Theme toggle */}
          <div className="py-2 flex justify-center w-full mt-auto">
            <ThemeToggle />
          </div>
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
      </SidebarContent>

      {/* Theme toggle and Credits card at bottom */}
      <SidebarFooter className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/40 dark:to-green-950/40 p-4 border border-green-200/50 dark:border-green-800/50 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-2 right-2 w-16 h-16 bg-green-200/30 dark:bg-green-700/20 rounded-lg transform rotate-12" />
          <div className="absolute top-6 right-6 w-12 h-12 bg-green-300/30 dark:bg-green-600/20 rounded-lg transform -rotate-6" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                Starter Plan
              </span>
              <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-full font-medium">
                {credits} Credits
              </span>
            </div>
            <Link href="/dashboard/credits">
              <Button
                size="sm"
                className="w-full h-10 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium"
              >
                Get more Credits!
              </Button>
            </Link>
            <p className="text-xs text-green-700 dark:text-green-400 mt-3 text-center leading-relaxed">
              Boost productivity with seamless tasks request and responsive AI,
              built to assist you.
            </p>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
