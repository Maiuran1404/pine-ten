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

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/80 lg:hidden transition-opacity duration-300 ease-in-out",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-[#0a0a0a] lg:static lg:z-auto transition-all duration-300 ease-in-out",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-64"
        )}
        style={{ fontFamily: "'Satoshi', sans-serif" }}
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Header with Toggle */}
        <div className={cn(
          "flex h-16 items-center shrink-0",
          collapsed ? "justify-center px-2" : "px-4"
        )}>
          {/* Desktop Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="hidden lg:inline-flex h-9 w-9 text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1f] rounded-lg"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
          >
            {collapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <PanelLeftClose className="h-5 w-5" />
            )}
          </Button>

          {/* Mobile Close Button */}
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden ml-auto h-9 w-9 text-[#6b6b6b] hover:text-white hover:bg-[#1a1a1f] rounded-lg"
              onClick={onClose}
              aria-label="Close sidebar"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Navigation */}
        <nav
          className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "px-2" : "px-3")}
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
                title={collapsed ? item.name : undefined}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200",
                  collapsed ? "justify-center p-2.5" : "px-3 py-2.5",
                  isActive
                    ? "bg-[#1a1a1f] text-white"
                    : "text-[#6b6b6b] hover:bg-[#1a1a1f]/50 hover:text-white"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 shrink-0",
                  isHighlight && !isActive && "text-emerald-500"
                )} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}

          {/* Recents Section */}
          {!collapsed && recentTasks.length > 0 && (
            <div className="pt-6">
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

        {/* Footer */}
        {!collapsed && (
          <div className="shrink-0 p-4">
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
        )}
      </aside>
    </>
  );
}
