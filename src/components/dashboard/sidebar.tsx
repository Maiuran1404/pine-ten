"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Home,
  FileText,
  Wand2,
  Wallet,
  Settings2,
  X,
  History,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";

const navigation = [
  {
    name: "Home",
    href: "/dashboard",
    icon: Home,
    highlight: true,
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

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  recentTasks?: Array<{ id: string; title: string }>;
}

export function Sidebar({ open, onClose, collapsed = false, onToggleCollapse, recentTasks = [] }: SidebarProps) {
  const pathname = usePathname();

  // On mobile, sidebar is never "collapsed" - it slides in/out at full width
  // collapsed state only applies on desktop (lg+)
  const isCollapsedDesktop = collapsed;

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/80 lg:hidden",
          "transition-opacity duration-300 ease-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          // Base styles
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0a0a0a]",
          // Mobile: always w-64, only transform animates
          "w-64 transform transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "-translate-x-full",
          // Desktop: static positioning, width changes based on collapsed
          "lg:static lg:z-auto lg:translate-x-0 lg:transition-[width] lg:duration-300",
          isCollapsedDesktop && "lg:w-16"
        )}
        style={{ fontFamily: "'Satoshi', sans-serif" }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header with Toggle */}
        <div className={cn(
          "flex h-16 items-center shrink-0 px-4",
          isCollapsedDesktop && "lg:justify-center lg:px-2"
        )}>
          {/* Desktop Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex h-9 w-9 text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1f] rounded-lg"
            onClick={onToggleCollapse}
            aria-label={isCollapsedDesktop ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!isCollapsedDesktop}
          >
            {isCollapsedDesktop ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          {/* Mobile Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden ml-auto h-9 w-9 text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1f] rounded-lg"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav
          className={cn(
            "flex-1 space-y-1 overflow-y-auto px-3",
            isCollapsedDesktop && "lg:px-2"
          )}
          aria-label="Sidebar navigation"
        >
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const isHighlight = 'highlight' in item && item.highlight;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                title={isCollapsedDesktop ? item.name : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-sm font-medium px-3 py-2.5",
                  "transition-colors duration-150",
                  isCollapsedDesktop && "lg:justify-center lg:p-2.5",
                  isActive
                    ? "bg-[#1a1a1f] text-white"
                    : "text-[#6b6b6b] hover:bg-[#1a1a1f]/50 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 shrink-0",
                  isHighlight && !isActive && "text-emerald-500"
                )} />
                <span className={cn(isCollapsedDesktop && "lg:hidden")}>{item.name}</span>
              </Link>
            );
          })}

          {/* Recents Section - hidden on desktop when collapsed */}
          {recentTasks.length > 0 && (
            <div className={cn("pt-6", isCollapsedDesktop && "lg:hidden")}>
              <div className="px-3 pb-2">
                <p className="text-xs font-medium text-[#4a4a4a] uppercase tracking-wider">
                  Recents
                </p>
              </div>
              <div className="space-y-1">
                {recentTasks.slice(0, 5).map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    onClick={onClose}
                    className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-[#6b6b6b] hover:bg-[#1a1a1f]/50 hover:text-white transition-colors"
                  >
                    <History className="h-4 w-4 shrink-0" />
                    <span className="truncate">{task.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Footer - hidden on desktop when collapsed */}
        <div className={cn("shrink-0 p-4", isCollapsedDesktop && "lg:hidden")}>
          <div className="px-3 py-2">
            <p className="text-xs text-[#4a4a4a]">
              Need help?
            </p>
            <a
              href="#"
              className="text-xs text-[#6b6b6b] hover:text-white underline underline-offset-4 transition-colors"
            >
              Contact support
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
